import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { Result } from "@js-soft/ts-utils"
import {
    AcceptRequestItemParameters,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestItemGroupParameters,
    DecideRequestParametersValidator,
    IDecideRequestParameters,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { ResponseItem, ResponseItemGroup, ResponseItemResult } from "@nmshd/content"
import { AccountController, CoreAddress, CoreId, IConfigOverwrite, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { TestUtil } from "../../core/TestUtil"
import {
    RequestsGiven,
    RequestsIntegrationTest,
    RequestsTestsContext,
    RequestsThen,
    RequestsWhen
} from "./RequestsIntegrationTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class IncomingRequestControllerTests extends RequestsIntegrationTest {
    public constructor(config: IConfigOverwrite, connection: IDatabaseConnection, loggerFactory: ILoggerFactory) {
        super(config, connection, loggerFactory)
    }

    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.loggerFactory)
        let accountController: AccountController
        let consumptionController: ConsumptionController
        let currentIdentity: CoreAddress

        describe("IncomingRequestController", function () {
            let Given: RequestsGiven // eslint-disable-line @typescript-eslint/naming-convention
            let When: RequestsWhen // eslint-disable-line @typescript-eslint/naming-convention
            let Then: RequestsThen // eslint-disable-line @typescript-eslint/naming-convention

            before(async function () {
                this.timeout(5000)

                await TestUtil.clearAccounts(that.connection)
                await transport.init()
                accountController = (await TestUtil.provideAccounts(transport, 1))[0]
                consumptionController = await new ConsumptionController(transport, accountController).init()

                consumptionController.incomingRequests.processorRegistry.registerProcessorForType(
                    TestRequestItemProcessor,
                    TestRequestItem
                )

                currentIdentity = accountController.identity.address

                that.init(new RequestsTestsContext(accountController, consumptionController))
                Given = that.Given
                When = that.When
                Then = that.Then
            })

            describe("Received", function () {
                it("creates an incoming Request with an incoming Message as source", async function () {
                    const incomingMessage = await TestObjectFactory.createIncomingMessage(currentIdentity)
                    await When.iCreateAnIncomingRequestWith({ source: incomingMessage })
                    await Then.theCreatedRequestHasAllProperties(
                        incomingMessage.cache!.createdBy,
                        incomingMessage.id,
                        "Message"
                    )
                }).timeout(5000)

                it("cannot create incoming Request from outgoing Message", async function () {
                    const outgoingMessage = await TestObjectFactory.createOutgoingMessage(currentIdentity)
                    await When.iTryToCreateAnIncomingRequestWith({ source: outgoingMessage })
                    await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create incoming Request from own Message")
                }).timeout(5000)

                it("creates an incoming Request with an incoming RelationshipTemplate as source", async function () {
                    const incomingTemplate = await TestObjectFactory.createIncomingRelationshipTemplate()
                    await When.iCreateAnIncomingRequestWith({ source: incomingTemplate })
                    await Then.theCreatedRequestHasAllProperties(
                        incomingTemplate.cache!.createdBy,
                        incomingTemplate.id,
                        "RelationshipTemplate"
                    )
                }).timeout(5000)

                it("persists the created ConsumptionRequest", async function () {
                    const incomingTemplate = await TestObjectFactory.createIncomingRelationshipTemplate()
                    await When.iCreateAnIncomingRequestWith({ source: incomingTemplate })
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("cannot create incoming Request from outgoing RelationshipTemplate", async function () {
                    const outgoingTemplate = await TestObjectFactory.createOutgoingRelationshipTemplate(currentIdentity)
                    await When.iTryToCreateAnIncomingRequestWith({ source: outgoingTemplate })
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot create incoming Request from own Relationship Template"
                    )
                }).timeout(5000)

                it("throws on syntactically invalid input", async function () {
                    const paramsWithoutSource = {
                        content: await TestObjectFactory.createRequestWithOneItem()
                    }

                    await TestUtil.expectThrowsAsync(
                        consumptionController.incomingRequests.received(paramsWithoutSource as any),
                        "*source*Value is not defined*"
                    )
                }).timeout(5000)

                it("created Consumption Request has ID of Request if one exists", async function () {
                    const request = await TestObjectFactory.createRequestWithOneItem({ id: await CoreId.generate() })

                    await When.iCreateAnIncomingRequestWith({ content: request })
                    await Then.theCreatedRequestHasTheId(request.id!)
                }).timeout(5000)
            })

            describe("Accept", function () {
                it("sets the response property of the Consumption Request to a ConsumptionResponse", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iAcceptTheRequest()
                    await Then.theRequestHasItsResponsePropertySet()
                }).timeout(5000)

                it("updates the status of the Consumption Request", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iAcceptTheRequest()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Decided)
                }).timeout(5000)

                it("persists the updated Consumption Request", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iAcceptTheRequest()
                    await Then.theChangesArePersistedInTheDatabase()
                }).timeout(5000)

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.Open)
                    await When.iAcceptTheRequest({
                        items: [
                            AcceptRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        expect(responseContent.items).to.have.lengthOf(2)
                        expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                        expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                        expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                    })
                }).timeout(5000)

                it("creates Response Items with the correct result", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.Open)
                    await When.iAcceptTheRequest({
                        items: [
                            AcceptRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        const outerResponseItem = responseContent.items[0] as ResponseItem
                        expect(outerResponseItem.result).to.equal(ResponseItemResult.Accepted)

                        const responseGroup = responseContent.items[1] as ResponseItemGroup
                        const innerResponseItem = responseGroup.items[0]
                        expect(innerResponseItem.result).to.equal(ResponseItemResult.Rejected)
                    })
                }).timeout(5000)

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.Open)
                    await When.iAcceptTheRequest({
                        items: [
                            AcceptRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        const outerResponseItem = responseContent.items[0] as ResponseItem
                        expect(outerResponseItem.metadata).to.deep.equal({
                            outerItemMetaKey: "outerItemMetaValue"
                        })

                        const responseGroup = responseContent.items[1] as ResponseItemGroup
                        expect(responseGroup.metadata).to.deep.equal({
                            groupMetaKey: "groupMetaValue"
                        })

                        const innerResponseItem = responseGroup.items[0]
                        expect(innerResponseItem.metadata).to.deep.equal({
                            innerItemMetaKey: "innerItemMetaValue"
                        })
                    })
                }).timeout(5000)

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToAcceptARequestWithoutItemsParameters()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                }).timeout(5000)
            })

            describe("Reject", function () {
                it("sets the response property of the Consumption Request to a ConsumptionResponse", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iRejectTheRequest()
                    await Then.theRequestHasItsResponsePropertySet()
                }).timeout(5000)

                it("updates the status of the Consumption Request", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iRejectTheRequest()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Decided)
                }).timeout(5000)

                it("persists the updated Consumption Request", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iRejectTheRequest()
                    await Then.theChangesArePersistedInTheDatabase()
                }).timeout(5000)

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.Open)
                    await When.iRejectTheRequest({
                        items: [
                            RejectRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        expect(responseContent.items).to.have.lengthOf(2)
                        expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                        expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                        expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                    })
                }).timeout(5000)

                it("creates Response Items with the correct result", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.Open)
                    await When.iRejectTheRequest({
                        items: [
                            RejectRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        const outerResponseItem = responseContent.items[0] as ResponseItem
                        expect(outerResponseItem.result).to.equal(ResponseItemResult.Rejected)

                        const responseGroup = responseContent.items[1] as ResponseItemGroup
                        const innerResponseItem = responseGroup.items[0]
                        expect(innerResponseItem.result).to.equal(ResponseItemResult.Rejected)
                    })
                }).timeout(5000)

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.Open)
                    await When.iRejectTheRequest({
                        items: [
                            RejectRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        const outerResponseItem = responseContent.items[0] as ResponseItem
                        expect(outerResponseItem.metadata).to.deep.equal({
                            outerItemMetaKey: "outerItemMetaValue"
                        })

                        const responseGroup = responseContent.items[1] as ResponseItemGroup
                        expect(responseGroup.metadata).to.deep.equal({
                            groupMetaKey: "groupMetaValue"
                        })

                        const innerResponseItem = responseGroup.items[0]
                        expect(innerResponseItem.metadata).to.deep.equal({
                            innerItemMetaKey: "innerItemMetaValue"
                        })
                    })
                }).timeout(5000)

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToRejectARequestWithSyntacticallyInvalidInput()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                }).timeout(5000)
            })

            describe("Get", function () {
                it("returns the Request with the given id if it exists", async function () {
                    const requestId = await ConsumptionIds.request.generate()
                    await Given.anIncomingRequestWith({ id: requestId })
                    await When.iGetTheIncomingRequestWith(requestId)
                    await Then.theReturnedRequestHasTheId(requestId)
                }).timeout(5000)

                it("returns undefined when the given id does not exist", async function () {
                    const aNonExistentId = await ConsumptionIds.request.generate()
                    await When.iGetTheIncomingRequestWith(aNonExistentId)
                    await Then.iExpectUndefinedToBeReturned()
                }).timeout(5000)

                it("returns undefined when the given id belongs to an outgoing Request", async function () {
                    const outgoingRequest = await Given.anOutgoingRequest()
                    await When.iGetTheIncomingRequestWith(outgoingRequest.id)
                    await Then.iExpectUndefinedToBeReturned()
                }).timeout(5000)
            })

            describe("Complete", function () {
                it("moves the ConsumptionRequest to status 'Completed'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Decided)
                    await When.iCompleteTheRequest()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                })

                it("persists the updated ConsumptionRequest", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Decided)
                    await When.iCompleteTheRequest()
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("cannot complete outgoing ConsumptionRequests", async function () {
                    await Given.anOutgoingRequest()
                    await When.iTryToCompleteTheRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Cannot decide own Request*")
                })

                it("can only complete ConsumptionRequests in status 'Decided'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCompleteTheRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Can only decide Request in status 'Decided'*")
                })
            })
        })
    }
}

export class AlwaysTrueDecideRequestParamsValidator extends DecideRequestParametersValidator {
    public override validate(_params: IDecideRequestParameters, _request: ConsumptionRequest): Result<undefined> {
        return Result.ok(undefined)
    }
}
