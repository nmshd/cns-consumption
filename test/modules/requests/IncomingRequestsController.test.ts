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
    IRejectRequestItemParameters,
    IRejectRequestParameters,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import {
    IRequest,
    IRequestItemGroup,
    Request,
    RequestItemGroup,
    ResponseItem,
    ResponseItemGroup,
    ResponseItemResult
} from "@nmshd/content"
import { AccountController, CoreAddress, CoreId, RelationshipChangeType, Transport } from "@nmshd/transport"
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
                    await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingMessage })
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
                    await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingTemplate })
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

                    await When.iCreateAnIncomingRequestWith({ receivedRequest: request })
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
                        receivedRequest: await TestObjectFactory.createRequestWithOneItem()
                    }
                    await TestUtil.expectThrowsAsync(
                        consumptionController.incomingRequests.received(paramsWithoutSource as any),
                        "*requestSourceObject*Value is not defined*"
                    )
                })
            })

            describe("CheckPrerequisites", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iCheckPrerequisites()
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.DecisionRequired)
                    await When.iRequireManualDecision()
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.ManualDecisionRequired)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("throws when the Consumption Request is not in status 'DecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToRequireManualDecision()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'DecisionRequired'*"
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
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                            status: ConsumptionRequestStatus.DecisionRequired
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

                it("throws when the Consumption Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCallCanAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
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
                        status: ConsumptionRequestStatus.DecisionRequired
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

            describe("CanReject", function () {
                it("returns 'success' on valid parameters", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.DecisionRequired)
                    await When.iCallCanReject()
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
                                        shouldFailAtCanReject: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            rejectParams: {
                                items: [
                                    {
                                        "@type": "RejectRequestItemParameters"
                                    } as IRejectRequestItemParameters
                                ]
                            } as Omit<IRejectRequestParameters, "requestId">
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
                                        shouldFailAtCanReject: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            rejectParams: {
                                items: [
                                    {
                                        "@type": "RejectRequestItemParameters",
                                        result: ResponseItemResult.Rejected
                                    } as IRejectRequestItemParameters,
                                    {
                                        "@type": "RejectRequestItemParameters",
                                        result: ResponseItemResult.Rejected
                                    } as IRejectRequestItemParameters
                                ]
                            } as Omit<IRejectRequestParameters, "requestId">
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
                                                shouldFailAtCanReject: true
                                            } as ITestRequestItem
                                        ]
                                    } as IRequestItemGroup
                                ]
                            } as IRequest,
                            rejectParams: {
                                items: [
                                    {
                                        "@type": "DecideRequestItemGroupParameters",
                                        items: [
                                            {
                                                "@type": "RejectRequestItemParameters",
                                                result: ResponseItemResult.Rejected
                                            } as IRejectRequestItemParameters
                                        ]
                                    }
                                ]
                            } as Omit<IRejectRequestParameters, "requestId">
                        }
                    ],
                    async function (testParams) {
                        await Given.anIncomingRequestWith({
                            content: testParams.request,
                            status: ConsumptionRequestStatus.DecisionRequired
                        })
                        await When.iCallCanRejectWith({
                            items: testParams.rejectParams.items
                        })
                        await Then.itReturnsAnErrorValidationResult()
                    }
                )

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToCallCanRejectWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCallCanRejectWithoutARequestId()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*")
                })

                it("throws when the Consumption Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCallCanReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
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
                                        shouldFailAtCanReject: true
                                    }),
                                    await TestRequestItem.from({
                                        mustBeAccepted: false
                                    }),
                                    await TestRequestItem.from({
                                        mustBeAccepted: false,
                                        shouldFailAtCanReject: true
                                    })
                                ]
                            })
                        ]
                    } as IRequest

                    const rejectParams = {
                        items: [
                            {
                                "@type": "RejectRequestItemParameters",
                                result: ResponseItemResult.Rejected
                            } as IRejectRequestItemParameters,
                            {
                                "@type": "DecideRequestItemGroupParameters",
                                items: [
                                    {
                                        "@type": "RejectRequestItemParameters",
                                        result: ResponseItemResult.Rejected
                                    } as IRejectRequestItemParameters,
                                    {
                                        "@type": "RejectRequestItemParameters",
                                        result: ResponseItemResult.Rejected
                                    } as IRejectRequestItemParameters,
                                    {
                                        "@type": "RejectRequestItemParameters",
                                        result: ResponseItemResult.Rejected
                                    } as IRejectRequestItemParameters
                                ]
                            }
                        ]
                    } as Omit<IRejectRequestParameters, "requestId">

                    await Given.anIncomingRequestWith({
                        content: request,
                        status: ConsumptionRequestStatus.DecisionRequired
                    })

                    const validationResult = await When.iCallCanRejectWith({
                        items: rejectParams.items
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

            describe("Accept", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.DecisionRequired)
                    await When.iAcceptTheRequest()
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Decided)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.DecisionRequired)
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

                it("throws when canAccept returns an error", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [await TestRequestItem.from({ mustBeAccepted: false, shouldFailAtCanAccept: true })]
                        },
                        status: ConsumptionRequestStatus.DecisionRequired
                    })
                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot accept the Request with the given parameters. Call 'canAccept' to get more information."
                    )
                })

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToAcceptWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when at least one RequestItemProcessor throws", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [await TestRequestItem.from({ mustBeAccepted: false, shouldThrowOnAccept: true })]
                        },
                        status: ConsumptionRequestStatus.DecisionRequired
                    })

                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "An error occurred while processing a 'TestRequestItem'*Details: Accept failed for testing purposes*"
                    )
                })

                it("throws when the Consumption Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToAcceptARequestWithoutItemsParameters()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                })
            })

            describe("Reject", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.DecisionRequired)
                    await When.iRejectTheRequest()
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Decided)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.DecisionRequired)
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
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(ConsumptionRequestStatus.DecisionRequired)
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

                it("throws when canReject returns an error", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [await TestRequestItem.from({ mustBeAccepted: false, shouldFailAtCanReject: true })]
                        },
                        status: ConsumptionRequestStatus.DecisionRequired
                    })
                    await When.iTryToReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot reject the Request with the given parameters. Call 'canReject' to get more information."
                    )
                })

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToRejectWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when at least one RequestItemProcessor throws", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [await TestRequestItem.from({ mustBeAccepted: false, shouldThrowOnReject: true })]
                        },
                        status: ConsumptionRequestStatus.DecisionRequired
                    })

                    await When.iTryToReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "An error occurred while processing a 'TestRequestItem'*Details: Reject failed for testing purposes*"
                    )
                })

                it("throws when the Consumption Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Consumption Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToAcceptARequestWithoutItemsParameters()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                })
            })

            describe("Complete", function () {
                it("can handle valid input with a Message as responseSource", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Decided)
                    await When.iCompleteTheIncomingRequestWith({
                        responseSourceObject: TestObjectFactory.createOutgoingIMessage(
                            accountController.identity.address
                        )
                    })
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" })
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("can handle valid input with a RelationshipChange as responseSource", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Decided)
                    const outgoingRelationshipCreationChange = TestObjectFactory.createOutgoingIRelationshipChange(
                        RelationshipChangeType.Creation,
                        accountController.identity.address
                    )
                    await When.iCompleteTheIncomingRequestWith({
                        responseSourceObject: outgoingRelationshipCreationChange
                    })
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "RelationshipChange" })
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("throws on syntactically invalid input", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Decided)
                    await When.iTryToCompleteTheIncomingRequestWithoutResponseSource()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*responseSource*Value is not defined*")
                })

                it("throws when the Consumption Request is not in status 'Decided'", async function () {
                    await Given.anIncomingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCompleteTheIncomingRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Consumption Request has to be in status 'Decided'*")
                })

                it("throws when no Consumption Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToCompleteTheIncomingRequestWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
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

            describe("Flows for incoming Requests", function () {
                it("Incoming Request via RelationshipTemplate", async function () {
                    const request = await Request.from({
                        items: [await TestRequestItem.from({ mustBeAccepted: false })]
                    })
                    const template = TestObjectFactory.createIncomingIRelationshipTemplate()

                    let cnsRequest = await consumptionController.incomingRequests.received({
                        receivedRequest: request,
                        requestSourceObject: template
                    })

                    cnsRequest = await consumptionController.incomingRequests.checkPrerequisites({
                        requestId: cnsRequest.id
                    })

                    cnsRequest = await consumptionController.incomingRequests.requireManualDecision({
                        requestId: cnsRequest.id
                    })
                    cnsRequest = await consumptionController.incomingRequests.accept({
                        requestId: cnsRequest.id,
                        items: [await AcceptRequestItemParameters.from({})]
                    })

                    const relationshipChange = TestObjectFactory.createOutgoingIRelationshipChange(
                        RelationshipChangeType.Creation,
                        accountController.identity.address
                    )

                    cnsRequest = await consumptionController.incomingRequests.complete({
                        requestId: cnsRequest.id,
                        responseSourceObject: relationshipChange
                    })

                    expect(cnsRequest).to.exist
                })

                it("Incoming Request via Message", async function () {
                    const request = await Request.from({
                        id: await CoreId.generate(),
                        items: [await TestRequestItem.from({ mustBeAccepted: false })]
                    })
                    const incomingMessage = TestObjectFactory.createIncomingIMessage(accountController.identity.address)

                    let cnsRequest = await consumptionController.incomingRequests.received({
                        receivedRequest: request,
                        requestSourceObject: incomingMessage
                    })

                    cnsRequest = await consumptionController.incomingRequests.checkPrerequisites({
                        requestId: cnsRequest.id
                    })

                    cnsRequest = await consumptionController.incomingRequests.requireManualDecision({
                        requestId: cnsRequest.id
                    })
                    cnsRequest = await consumptionController.incomingRequests.accept({
                        requestId: cnsRequest.id,
                        items: [await AcceptRequestItemParameters.from({})]
                    })

                    const responseMessage = TestObjectFactory.createOutgoingIMessage(accountController.identity.address)

                    cnsRequest = await consumptionController.incomingRequests.complete({
                        requestId: cnsRequest.id,
                        responseSourceObject: responseMessage
                    })

                    expect(cnsRequest).to.exist
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
