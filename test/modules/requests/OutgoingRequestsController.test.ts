import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { Result } from "@js-soft/ts-utils"
import {
    ConsumptionController,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    ConsumptionResponse,
    CreateIncomingRequestParameters,
    DecideRequestParamsValidator,
    ICreateOutgoingRequestParameters,
    IDecideRequestParameters
} from "@nmshd/consumption"
import { AcceptResponseItem, IResponse, Request, Response, ResponseItemResult, ResponseResult } from "@nmshd/content"
import { AccountController, CoreAddress, CoreId, IConfigOverwrite, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

export class AlwaysTrueDecideRequestParamsValidator extends DecideRequestParamsValidator {
    public validate(_params: IDecideRequestParameters, _request: ConsumptionRequest): Result<undefined> {
        return Result.ok(undefined)
    }
}

export class OutgoingRequestControllerTests extends IntegrationTest {
    public constructor(
        protected config: IConfigOverwrite,
        protected connection: IDatabaseConnection,
        protected loggerFactory: ILoggerFactory
    ) {
        super(config, connection, loggerFactory)
    }

    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.loggerFactory)
        let defaultAccount: Account

        describe("RequestController", function () {
            before(async function () {
                this.timeout(5000)

                await TestUtil.clearAccounts(that.connection)
                await transport.init()
                const accountController = (await TestUtil.provideAccounts(transport, 1))[0]
                const consumptionController = await new ConsumptionController(transport, accountController).init()

                defaultAccount = {
                    accountController,
                    consumptionController
                }
            })

            describe("CreateOutgoingRequest", function () {
                it("creates a new outgoing ConsumptionRequest", async function () {
                    const params: ICreateOutgoingRequestParameters = {
                        content: {
                            items: [
                                {
                                    mustBeAccepted: false
                                }
                            ]
                        },
                        peer: CoreAddress.from("id1")
                    }

                    const createdRequest =
                        await defaultAccount.consumptionController.outgoingRequests.createOutgoingRequest(params)

                    expect(createdRequest).to.exist
                    expect(createdRequest.id).to.exist
                    expect(createdRequest.status).to.equal(ConsumptionRequestStatus.Draft)
                    expect(createdRequest.content).to.be.instanceOf(Request)
                    expect(createdRequest.content.id).to.exist
                    expect(createdRequest.source).to.be.undefined
                })

                it("persists the created Request", async function () {
                    const params: ICreateOutgoingRequestParameters = {
                        content: {
                            items: [
                                {
                                    mustBeAccepted: false
                                }
                            ]
                        },
                        peer: CoreAddress.from("id1")
                    }

                    const createdRequest =
                        await defaultAccount.consumptionController.outgoingRequests.createOutgoingRequest(params)

                    const request = await defaultAccount.consumptionController.outgoingRequests.get(createdRequest.id)

                    expect(request).to.be.instanceOf(ConsumptionRequest)
                })
            })

            describe("AnswerForOutgoingRequestReceived", function () {
                it("updates the ConsumptionRequest", async function () {
                    const request = await defaultAccount.consumptionController.outgoingRequests.createOutgoingRequest({
                        content: {
                            items: [
                                {
                                    mustBeAccepted: false
                                }
                            ]
                        },
                        peer: CoreAddress.from("id1")
                    })

                    const requestWithResponse =
                        await defaultAccount.consumptionController.outgoingRequests.responseForOutgoingRequestReceived(
                            request.id,
                            await TestObjectFactory.createIncomingMessage(
                                defaultAccount.accountController.identity.address
                            ),
                            {
                                result: ResponseResult.Accepted,
                                requestId: request.id,
                                items: [await AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
                            } as IResponse
                        )

                    expect(requestWithResponse.response).to.be.instanceOf(ConsumptionResponse)
                    expect(requestWithResponse.response!.content).to.be.instanceOf(Response)

                    expect(requestWithResponse.status).to.equal(ConsumptionRequestStatus.Answered)

                    const statusLogEntry = requestWithResponse.statusLog[requestWithResponse.statusLog.length - 1]
                    expect(statusLogEntry.oldStatus).to.equal(ConsumptionRequestStatus.Draft)
                    expect(statusLogEntry.newStatus).to.equal(ConsumptionRequestStatus.Answered)
                })

                it("persists the updated ConsumptionRequest", async function () {
                    const request = await defaultAccount.consumptionController.outgoingRequests.createOutgoingRequest({
                        content: {
                            items: [
                                {
                                    mustBeAccepted: false
                                }
                            ]
                        },
                        peer: CoreAddress.from("id1")
                    })
                    await defaultAccount.consumptionController.outgoingRequests.responseForOutgoingRequestReceived(
                        request.id,
                        await TestObjectFactory.createIncomingMessage(
                            defaultAccount.accountController.identity.address
                        ),
                        {
                            result: ResponseResult.Accepted,
                            requestId: request.id,
                            items: [await AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
                        } as IResponse
                    )

                    const answeredRequest = (await defaultAccount.consumptionController.outgoingRequests.get(
                        request.id
                    ))!

                    expect(answeredRequest.status).to.equal(ConsumptionRequestStatus.Answered)
                })
            })

            describe("Get", function () {
                it("returns a Request that was created before", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    const consumptionRequest = await defaultAccount.consumptionController.outgoingRequests.get(
                        createdConsumptionRequest.id
                    )

                    expect(consumptionRequest).to.exist
                }).timeout(5000)

                it("returns undefined when the given id does not exist", async function () {
                    const consumptionRequest = await defaultAccount.consumptionController.outgoingRequests.get(
                        await CoreId.generate()
                    )

                    expect(consumptionRequest).to.be.undefined
                }).timeout(5000)
            })
        })
    }
}

interface Account {
    accountController: AccountController
    consumptionController: ConsumptionController
}
