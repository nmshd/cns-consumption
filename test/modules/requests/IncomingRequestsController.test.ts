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
    ErrorValidationResult,
    IAcceptRequestItemParameters,
    IAcceptRequestParameters,
    IDecideRequestParameters,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import {
    IRequest,
    IRequestItemGroup,
    RequestItemGroup,
    ResponseItem,
    ResponseItemGroup,
    ResponseItemResult
} from "@nmshd/content"
import { AccountController, CoreAddress, CoreId, IConfigOverwrite, Transport } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import { TestUtil } from "../../core/TestUtil"
import {
    RequestsGiven,
    RequestsIntegrationTest,
    RequestsTestsContext,
    RequestsThen,
    RequestsWhen
} from "./RequestsIntegrationTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"
import { ITestRequestItem, TestRequestItem } from "./testHelpers/TestRequestItem"
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

        describe("IncomingRequestsController", function () {
            let Given: RequestsGiven // eslint-disable-line @typescript-eslint/naming-convention
            let When: RequestsWhen // eslint-disable-line @typescript-eslint/naming-convention
            let Then: RequestsThen // eslint-disable-line @typescript-eslint/naming-convention

            before(async function () {
                this.timeout(5000)

                await TestUtil.clearAccounts(that.connection)
                await transport.init()
                ;({ accountController, consumptionController } = (await TestUtil.provideAccounts(transport, 1))[0])

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
                it("creates an incoming Request with an incoming Message as sourceObject", async function () {
                    const incomingMessage = await TestObjectFactory.createIncomingMessage(currentIdentity)
                    await When.iCreateAnIncomingRequestWith({ sourceObject: incomingMessage })
                    await Then.theCreatedRequestHasAllProperties(
                        incomingMessage.cache!.createdBy,
                        incomingMessage.id,
                        "Message"
                    )
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.Open)
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("creates an incoming Request with an incoming RelationshipTemplate as source", async function () {
                    const incomingTemplate = await TestObjectFactory.createIncomingRelationshipTemplate()
                    await When.iCreateAnIncomingRequestWith({ sourceObject: incomingTemplate })
                    await Then.theCreatedRequestHasAllProperties(
                        incomingTemplate.cache!.createdBy,
                        incomingTemplate.id,
                        "RelationshipTemplate"
                    )
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.Open)
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("uses the ID of the given Request if it exists", async function () {
                    const request = await TestObjectFactory.createRequestWithOneItem({ id: await CoreId.generate() })

                    await When.iCreateAnIncomingRequestWith({ content: request })
                    await Then.theRequestHasTheId(request.id!)
                })

                it("cannot create incoming Request with an outgoing Message as source", async function () {
                    const outgoingMessage = await TestObjectFactory.createOutgoingMessage(currentIdentity)
                    await When.iTryToCreateAnIncomingRequestWith({ sourceObject: outgoingMessage })
                    await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create incoming Request from own Message")
                })

                it("cannot create incoming Request with an outgoing RelationshipTemplate as source", async function () {
                    const outgoingTemplate = await TestObjectFactory.createOutgoingRelationshipTemplate(currentIdentity)
                    await When.iTryToCreateAnIncomingRequestWith({ sourceObject: outgoingTemplate })
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot create incoming Request from own Relationship Template"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    const paramsWithoutSource = {
                        content: await TestObjectFactory.createRequestWithOneItem()
                    }
                    await TestUtil.expectThrowsAsync(
                        consumptionController.incomingRequests.received(paramsWithoutSource as any),
                        "*source*Value is not defined*"
                    )
                })
            })

            describe("CheckPrerequisites", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iCheckPrerequisites()
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.WaitingForDecision)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                itParam(
                    "does not change the status when a RequestItemProcessor returns false",
                    [
                        {
                            content: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        shouldFailAtCheckPrerequisitesOfIncomingRequestItem: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest
                        },
                        {
                            content: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    } as ITestRequestItem,
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        shouldFailAtCheckPrerequisitesOfIncomingRequestItem: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest
                        },
                        {
                            content: {
                                items: [
                                    {
                                        "@type": "RequestItemGroup",
                                        mustBeAccepted: false,
                                        items: [
                                            {
                                                "@type": "TestRequestItem",
                                                mustBeAccepted: false,
                                                shouldFailAtCheckPrerequisitesOfIncomingRequestItem: true
                                            } as ITestRequestItem
                                        ]
                                    } as IRequestItemGroup
                                ]
                            } as IRequest
                        }
                    ],
                    async function (testParams) {
                        await Given.anIncomingRequestWith({
                            status: ConsumptionRequestStatus.Open,
                            content: testParams.content
                        })
                        await When.iCheckPrerequisites()
                        await Then.theRequestIsInStatus(ConsumptionRequestStatus.Open)
                    }
                )

                it("throws when the Consumption Request is not in status 'Open'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.WaitingForDecision)
                    await When.iTryToCheckPrerequisites()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Consumption Request has to be in status 'Open'*")
                })

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToCheckPrerequisitesWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCheckPrerequisitesWithoutARequestId()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*")
                })
            })

            describe("RequireManualDecision", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.WaitingForDecision)
                    await When.iRequireManualDecision()
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.ManualDecisionRequired)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("throws when the Consumption Request is not in status 'WaitingForDecision'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToRequireManualDecision()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'WaitingForDecision'*"
                    )
                })

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToRequireManualDecisionWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToRequireManualDecisionWithoutRequestId()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*")
                })
            })

            describe("CanAccept", function () {
                it("returns 'success' on valid parameters", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.WaitingForDecision)
                    await When.iCallCanAccept()
                    await Then.itReturnsASuccessfulValidationResult()
                })

                itParam(
                    "returns 'error' when at least one RequestItem is invalid",
                    [
                        {
                            request: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        shouldFailAtCanAccept: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            acceptParams: {
                                items: [
                                    {
                                        "@type": "AcceptRequestItemParameters"
                                    } as IAcceptRequestItemParameters
                                ]
                            } as Omit<IAcceptRequestParameters, "requestId">
                        },

                        {
                            request: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    } as ITestRequestItem,
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        shouldFailAtCanAccept: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            acceptParams: {
                                items: [
                                    {
                                        "@type": "AcceptRequestItemParameters",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptRequestItemParameters,
                                    {
                                        "@type": "AcceptRequestItemParameters",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptRequestItemParameters
                                ]
                            } as Omit<IAcceptRequestParameters, "requestId">
                        },

                        {
                            request: {
                                items: [
                                    {
                                        "@type": "RequestItemGroup",
                                        mustBeAccepted: false,
                                        items: [
                                            {
                                                "@type": "TestRequestItem",
                                                mustBeAccepted: false,
                                                shouldFailAtCanAccept: true
                                            } as ITestRequestItem
                                        ]
                                    } as IRequestItemGroup
                                ]
                            } as IRequest,
                            acceptParams: {
                                items: [
                                    {
                                        "@type": "DecideRequestItemGroupParameters",
                                        items: [
                                            {
                                                "@type": "AcceptRequestItemParameters",
                                                result: ResponseItemResult.Accepted
                                            } as IAcceptRequestItemParameters
                                        ]
                                    }
                                ]
                            } as Omit<IAcceptRequestParameters, "requestId">
                        }
                    ],
                    async function (testParams) {
                        await Given.anIncomingRequestWith({
                            content: testParams.request,
                            status: ConsumptionRequestStatus.WaitingForDecision
                        })
                        await When.iCallCanAcceptWith({
                            items: testParams.acceptParams.items
                        })
                        await Then.itReturnsAnErrorValidationResult()
                    }
                )

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToCallCanAcceptWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCallCanAcceptWithoutARequestId()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*")
                })

                it("throws when the Consumption Request is not in status 'WaitingForDecision'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCallCanAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'WaitingForDecision'*"
                    )
                })

                it("returns a validation result that contains a sub result for each item", async function () {
                    const request = {
                        items: [
                            await TestRequestItem.from({
                                mustBeAccepted: false
                            }),
                            await RequestItemGroup.from({
                                mustBeAccepted: false,
                                items: [
                                    await TestRequestItem.from({
                                        mustBeAccepted: false,
                                        shouldFailAtCanAccept: true
                                    }),
                                    await TestRequestItem.from({
                                        mustBeAccepted: false
                                    }),
                                    await TestRequestItem.from({
                                        mustBeAccepted: false,
                                        shouldFailAtCanAccept: true
                                    })
                                ]
                            })
                        ]
                    } as IRequest

                    const acceptParams = {
                        items: [
                            {
                                "@type": "AcceptRequestItemParameters",
                                result: ResponseItemResult.Accepted
                            } as IAcceptRequestItemParameters,
                            {
                                "@type": "DecideRequestItemGroupParameters",
                                items: [
                                    {
                                        "@type": "AcceptRequestItemParameters",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptRequestItemParameters,
                                    {
                                        "@type": "AcceptRequestItemParameters",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptRequestItemParameters,
                                    {
                                        "@type": "AcceptRequestItemParameters",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptRequestItemParameters
                                ]
                            }
                        ]
                    } as Omit<IAcceptRequestParameters, "requestId">

                    await Given.anIncomingRequestWith({
                        content: request,
                        status: ConsumptionRequestStatus.WaitingForDecision
                    })

                    const validationResult = await When.iCallCanAcceptWith({
                        items: acceptParams.items
                    })

                    expect(validationResult.isError()).to.be.true
                    expect((validationResult as ErrorValidationResult).code).to.equal("inheritedFromItem")
                    expect((validationResult as ErrorValidationResult).message).to.equal(
                        "Some child items have errors."
                    )
                    expect(validationResult.items).to.have.lengthOf(2)

                    expect(validationResult.items[0].isError()).to.be.false

                    expect(validationResult.items[1].isError()).to.be.true
                    expect((validationResult.items[1] as ErrorValidationResult).code).to.equal("inheritedFromItem")
                    expect((validationResult.items[1] as ErrorValidationResult).message).to.equal(
                        "Some child items have errors."
                    )

                    expect(validationResult.items[1].items).to.have.lengthOf(3)
                    expect(validationResult.items[1].items[0].isError()).to.be.true
                    expect(validationResult.items[1].items[1].isError()).to.be.false
                    expect(validationResult.items[1].items[2].isError()).to.be.true
                })
            })

            describe.only("Accept", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.WaitingForDecision)
                    await When.iAcceptTheRequest()
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Decided)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(
                        ConsumptionRequestStatus.WaitingForDecision
                    )
                    await When.iAcceptTheRequest({
                        items: [
                            await AcceptRequestItemParameters.from({}),
                            await DecideRequestItemGroupParameters.from({
                                items: [await RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        expect(responseContent.items).to.have.lengthOf(2)
                        expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                        expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                        expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                    })
                })

                it("creates Response Items with the correct result", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(
                        ConsumptionRequestStatus.WaitingForDecision
                    )
                    await When.iAcceptTheRequest({
                        items: [
                            await AcceptRequestItemParameters.from({}),
                            await DecideRequestItemGroupParameters.from({
                                items: [await RejectRequestItemParameters.from({})]
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
                })

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(
                        ConsumptionRequestStatus.WaitingForDecision
                    )
                    await When.iAcceptTheRequest({
                        items: [
                            await AcceptRequestItemParameters.from({}),
                            await DecideRequestItemGroupParameters.from({
                                items: [await RejectRequestItemParameters.from({})]
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
                })

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToAcceptWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when the Consumption Request is not in status 'WaitingForDecision'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'WaitingForDecision'*"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToAcceptARequestWithoutItemsParameters()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                })
            })

            describe("Reject", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.WaitingForDecision)
                    await When.iRejectTheRequest()
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Decided)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(
                        ConsumptionRequestStatus.WaitingForDecision
                    )
                    await When.iRejectTheRequest({
                        items: [
                            await RejectRequestItemParameters.from({}),
                            await DecideRequestItemGroupParameters.from({
                                items: [await RejectRequestItemParameters.from({})]
                            })
                        ]
                    })
                    await Then.iExpectTheResponseContent((responseContent) => {
                        expect(responseContent.items).to.have.lengthOf(2)
                        expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                        expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                        expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                    })
                })

                it("creates Response Items with the correct result", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(
                        ConsumptionRequestStatus.WaitingForDecision
                    )
                    await When.iRejectTheRequest({
                        items: [
                            await RejectRequestItemParameters.from({}),
                            await DecideRequestItemGroupParameters.from({
                                items: [await RejectRequestItemParameters.from({})]
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
                })

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(
                        ConsumptionRequestStatus.WaitingForDecision
                    )
                    await When.iRejectTheRequest({
                        items: [
                            await RejectRequestItemParameters.from({}),
                            await DecideRequestItemGroupParameters.from({
                                items: [await RejectRequestItemParameters.from({})]
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
                })

                it("throws when the Consumption Request is not in status 'WaitingForDecision'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'WaitingForDecision'*"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToRejectARequestWithSyntacticallyInvalidInput()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                })
            })

            describe("Complete", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Decided)
                    await When.iCompleteTheRequest()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
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
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Consumption Request has to be in status 'Decided'*")
                })
            })

            describe("Get", function () {
                it("returns the Request with the given id if it exists", async function () {
                    const requestId = await ConsumptionIds.request.generate()
                    await Given.anIncomingRequestWith({ id: requestId })
                    await When.iGetTheIncomingRequestWith(requestId)
                    await Then.theReturnedRequestHasTheId(requestId)
                })

                it("returns undefined when the given id does not exist", async function () {
                    const aNonExistentId = await ConsumptionIds.request.generate()
                    await When.iGetTheIncomingRequestWith(aNonExistentId)
                    await Then.iExpectUndefinedToBeReturned()
                })

                it("returns undefined when the given id belongs to an outgoing Request", async function () {
                    const outgoingRequest = await Given.anOutgoingRequest()
                    await When.iGetTheIncomingRequestWith(outgoingRequest.id)
                    await Then.iExpectUndefinedToBeReturned()
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
