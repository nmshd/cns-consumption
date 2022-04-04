import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { Result } from "@js-soft/ts-utils"
import {
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestParametersValidator,
    IDecideRequestParameters
} from "@nmshd/consumption"
import { AccountController, IConfigOverwrite, Transport } from "@nmshd/transport"
import { TestUtil } from "../../core/TestUtil"
import {
    RequestsGiven,
    RequestsIntegrationTest,
    RequestsTestsContext,
    RequestsThen,
    RequestsWhen
} from "./RequestsIntegrationTest"

export class AlwaysTrueDecideRequestParamsValidator extends DecideRequestParametersValidator {
    public validate(_params: IDecideRequestParameters, _request: ConsumptionRequest): Result<undefined> {
        return Result.ok(undefined)
    }
}

export class OutgoingRequestControllerTests extends RequestsIntegrationTest {
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
        let accountController: AccountController
        let consumptionController: ConsumptionController

        describe("OutgoingRequestController", function () {
            let Given: RequestsGiven // eslint-disable-line @typescript-eslint/naming-convention
            let When: RequestsWhen // eslint-disable-line @typescript-eslint/naming-convention
            let Then: RequestsThen // eslint-disable-line @typescript-eslint/naming-convention

            before(async function () {
                this.timeout(5000)

                await TestUtil.clearAccounts(that.connection)
                await transport.init()
                accountController = (await TestUtil.provideAccounts(transport, 1))[0]
                consumptionController = await new ConsumptionController(transport, accountController).init()

                that.init(new RequestsTestsContext(accountController, consumptionController))
                Given = that.Given
                When = that.When
                Then = that.Then
            })

            describe("CreateOutgoingRequest", function () {
                it("creates a new outgoing ConsumptionRequest", async function () {
                    await When.iCreateAnOutgoingRequest()
                    await Then.theCreatedOutgoingRequestHasAllProperties()
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.Draft)
                    await Then.theRequestDoesNotHaveSourceAndPeerSet()
                })

                it("persists the created Request", async function () {
                    await When.iCreateAnOutgoingRequest()
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })
            })

            describe("CompleteOutgoingRequest", function () {
                it("moves the ConsumptionRequest to status 'Completed'", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iCompleteTheOutgoingRequest()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                })

                it("sets the response property of the Consumption Request to a ConsumptionResponse", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iCompleteTheOutgoingRequest()
                    await Then.theRequestHasItsResponsePropertySet()
                })

                it("persists the updated ConsumptionRequest", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iCompleteTheOutgoingRequest()
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })
            })

            describe("Get", function () {
                it("returns the Request with the given id if it exists", async function () {
                    const outgoingRequest = await Given.anOutgoingRequest()
                    await When.iGetTheOutgoingRequestWith(outgoingRequest.id)
                    await Then.theReturnedRequestHasTheId(outgoingRequest.id)
                }).timeout(5000)

                it("returns undefined when the given id does not exist", async function () {
                    const aNonExistentId = await ConsumptionIds.request.generate()
                    await When.iGetTheOutgoingRequestWith(aNonExistentId)
                    await Then.iExpectUndefinedToBeReturned()
                }).timeout(5000)

                it("returns undefined when the given id belongs to an outgoing Request", async function () {
                    const theIdOfTheRequest = await ConsumptionIds.request.generate()
                    await Given.anIncomingRequestWith({ id: theIdOfTheRequest })
                    await When.iGetTheOutgoingRequestWith(theIdOfTheRequest)
                    await Then.iExpectUndefinedToBeReturned()
                }).timeout(5000)
            })
        })
    }
}
