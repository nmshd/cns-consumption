import {
    ConsumptionIds,
    DecideRequestItemGroupParametersJSON,
    DecideRequestParametersJSON,
    DecideRequestParametersValidator,
    ErrorValidationResult,
    LocalRequest,
    LocalRequestStatus,
    ValidationResult
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
import { CoreId, RelationshipChangeType, TransportLoggerFactory } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import {
    RequestsGiven,
    RequestsIntegrationTest,
    RequestsTestsContext,
    RequestsThen,
    RequestsWhen
} from "./RequestsIntegrationTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"
import { ITestRequestItem, TestRequestItem } from "./testHelpers/TestRequestItem"

export class IncomingRequestControllerTests extends RequestsIntegrationTest {
    public run(): void {
        const that = this
        let context: RequestsTestsContext

        describe("IncomingRequestsController", function () {
            let Given: RequestsGiven // eslint-disable-line @typescript-eslint/naming-convention
            let When: RequestsWhen // eslint-disable-line @typescript-eslint/naming-convention
            let Then: RequestsThen // eslint-disable-line @typescript-eslint/naming-convention

            beforeEach(async function () {
                this.timeout(5000)

                TransportLoggerFactory.init(that.loggerFactory)

                context = await RequestsTestsContext.create(that.connection, that.config)

                that.init(context)

                Given = that.Given
                When = that.When
                Then = that.Then
            })

            afterEach(function () {
                context.reset()
            })

            describe("Received", function () {
                it("creates an incoming Request with an incoming Message as sourceObject", async function () {
                    const incomingMessage = TestObjectFactory.createIncomingMessage(context.currentIdentity)
                    await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingMessage })
                    await Then.theCreatedRequestHasAllProperties(
                        incomingMessage.cache!.createdBy,
                        incomingMessage.id,
                        "Message"
                    )
                    await Then.theRequestIsInStatus(LocalRequestStatus.Open)
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("creates an incoming Request with an incoming RelationshipTemplate as source", async function () {
                    const incomingTemplate = TestObjectFactory.createIncomingRelationshipTemplate()
                    await When.iCreateAnIncomingRequestWith({ requestSourceObject: incomingTemplate })
                    await Then.theCreatedRequestHasAllProperties(
                        incomingTemplate.cache!.createdBy,
                        incomingTemplate.id,
                        "RelationshipTemplate"
                    )
                    await Then.theRequestIsInStatus(LocalRequestStatus.Open)
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("uses the ID of the given Request if it exists", async function () {
                    const request = TestObjectFactory.createRequestWithOneItem({ id: await CoreId.generate() })

                    await When.iCreateAnIncomingRequestWith({ receivedRequest: request })
                    await Then.theRequestHasTheId(request.id!)
                })

                it("cannot create incoming Request with an outgoing Message as source", async function () {
                    const outgoingMessage = TestObjectFactory.createOutgoingMessage(context.currentIdentity)
                    await When.iTryToCreateAnIncomingRequestWith({ sourceObject: outgoingMessage })
                    await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create incoming Request from own Message")
                })

                it("cannot create incoming Request with an outgoing RelationshipTemplate as source", async function () {
                    const outgoingTemplate = TestObjectFactory.createOutgoingRelationshipTemplate(
                        context.currentIdentity
                    )
                    await When.iTryToCreateAnIncomingRequestWith({ sourceObject: outgoingTemplate })
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot create incoming Request from own Relationship Template"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCallReceivedWithoutSource()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestSourceObject*Value is not defined*")
                })
            })

            describe("CheckPrerequisites", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iCheckPrerequisites()
                    await Then.theRequestIsInStatus(LocalRequestStatus.DecisionRequired)
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
                            status: LocalRequestStatus.Open,
                            content: testParams.content
                        })
                        await When.iCheckPrerequisites()
                        await Then.theRequestIsInStatus(LocalRequestStatus.Open)
                    }
                )

                it("throws when the Local Request is not in status 'Open'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iTryToCheckPrerequisites()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Open'*")
                })

                it("throws when no Local Request with the given id exists in DB", async function () {
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
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iRequireManualDecision()
                    await Then.theRequestIsInStatus(LocalRequestStatus.ManualDecisionRequired)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("throws when the Local Request is not in status 'DecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToRequireManualDecision()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Local Request has to be in status 'DecisionRequired'*"
                    )
                })

                it("throws when no Local Request with the given id exists in DB", async function () {
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
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired)
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
                                        accept: true
                                    }
                                ]
                            } as Omit<DecideRequestParametersJSON, "requestId">
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
                                        accept: true
                                    },
                                    {
                                        accept: true
                                    }
                                ]
                            } as Omit<DecideRequestParametersJSON, "requestId">
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
                                        items: [
                                            {
                                                accept: true
                                            }
                                        ]
                                    } as DecideRequestItemGroupParametersJSON
                                ]
                            } as Omit<DecideRequestParametersJSON, "requestId">
                        }
                    ],
                    async function (testParams) {
                        await Given.anIncomingRequestWith({
                            content: testParams.request,
                            status: LocalRequestStatus.DecisionRequired
                        })
                        await When.iCallCanAcceptWith({
                            items: testParams.acceptParams.items
                        })
                        await Then.itReturnsAnErrorValidationResult()
                    }
                )

                it("throws when no Local Request with the given id exists in DB", async function () {
                    await When.iTryToCallCanAcceptWith({ requestId: "nonExistentId" })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCallCanAcceptWithoutARequestId()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*")
                })

                it("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToCallCanAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
                    )
                })

                it("returns a validation result that contains a sub result for each item", async function () {
                    const request = {
                        items: [
                            TestRequestItem.from({
                                mustBeAccepted: false
                            }),
                            RequestItemGroup.from({
                                mustBeAccepted: false,
                                items: [
                                    TestRequestItem.from({
                                        mustBeAccepted: false,
                                        shouldFailAtCanAccept: true
                                    }),
                                    TestRequestItem.from({
                                        mustBeAccepted: false
                                    }),
                                    TestRequestItem.from({
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
                                accept: true
                            },
                            {
                                items: [
                                    {
                                        accept: true
                                    },
                                    {
                                        accept: true
                                    },
                                    {
                                        accept: true
                                    }
                                ]
                            }
                        ]
                    } as Omit<DecideRequestParametersJSON, "requestId">

                    await Given.anIncomingRequestWith({
                        content: request,
                        status: LocalRequestStatus.DecisionRequired
                    })

                    const validationResult = await When.iCallCanAcceptWith({
                        items: acceptParams.items
                    })

                    expect(validationResult.isError()).to.be.true
                    expect((validationResult as ErrorValidationResult).error.code).to.equal("inheritedFromItem")
                    expect((validationResult as ErrorValidationResult).error.message).to.equal(
                        "Some child items have errors."
                    )
                    expect(validationResult.items).to.have.lengthOf(2)

                    expect(validationResult.items[0].isError()).to.be.false

                    expect(validationResult.items[1].isError()).to.be.true
                    expect((validationResult.items[1] as ErrorValidationResult).error.code).to.equal(
                        "inheritedFromItem"
                    )
                    expect((validationResult.items[1] as ErrorValidationResult).error.message).to.equal(
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
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired)
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
                                        accept: false
                                    }
                                ]
                            } as Omit<DecideRequestParametersJSON, "requestId">
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
                                        accept: false
                                    },
                                    {
                                        accept: false
                                    }
                                ]
                            } as Omit<DecideRequestParametersJSON, "requestId">
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
                                        items: [
                                            {
                                                accept: false
                                            }
                                        ]
                                    }
                                ]
                            } as Omit<DecideRequestParametersJSON, "requestId">
                        }
                    ],
                    async function (testParams) {
                        await Given.anIncomingRequestWith({
                            content: testParams.request,
                            status: LocalRequestStatus.DecisionRequired
                        })
                        await When.iCallCanRejectWith(testParams.rejectParams)
                        await Then.itReturnsAnErrorValidationResult()
                    }
                )

                it("throws when no Local Request with the given id exists in DB", async function () {
                    await When.iTryToCallCanRejectWith({ requestId: "nonExistentId" })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCallCanRejectWithoutARequestId()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestId*Value is not defined*")
                })

                it("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToCallCanReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
                    )
                })

                it("returns a validation result that contains a sub result for each item", async function () {
                    const request = {
                        items: [
                            TestRequestItem.from({
                                mustBeAccepted: false
                            }),
                            RequestItemGroup.from({
                                mustBeAccepted: false,
                                items: [
                                    TestRequestItem.from({
                                        mustBeAccepted: false,
                                        shouldFailAtCanReject: true
                                    }),
                                    TestRequestItem.from({
                                        mustBeAccepted: false
                                    }),
                                    TestRequestItem.from({
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
                                accept: false
                            },
                            {
                                accept: false,
                                items: [
                                    {
                                        accept: false
                                    },
                                    {
                                        accept: false
                                    },
                                    {
                                        accept: false
                                    }
                                ]
                            }
                        ]
                    } as Omit<DecideRequestParametersJSON, "requestId">

                    await Given.anIncomingRequestWith({
                        content: request,
                        status: LocalRequestStatus.DecisionRequired
                    })

                    const validationResult = await When.iCallCanRejectWith(rejectParams)

                    expect(validationResult.isError()).to.be.true
                    expect((validationResult as ErrorValidationResult).error.code).to.equal("inheritedFromItem")
                    expect((validationResult as ErrorValidationResult).error.message).to.equal(
                        "Some child items have errors."
                    )
                    expect(validationResult.items).to.have.lengthOf(2)

                    expect(validationResult.items[0].isError()).to.be.false

                    expect(validationResult.items[1].isError()).to.be.true
                    expect((validationResult.items[1] as ErrorValidationResult).error.code).to.equal(
                        "inheritedFromItem"
                    )
                    expect((validationResult.items[1] as ErrorValidationResult).error.message).to.equal(
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
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iAcceptTheRequest()
                    await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted)
                    await Then.theRequestMovesToStatus(LocalRequestStatus.Decided)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iAcceptTheRequest({
                        items: [
                            {
                                accept: true
                            },
                            {
                                items: [
                                    {
                                        accept: false
                                    }
                                ]
                            }
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
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iAcceptTheRequest({
                        items: [
                            {
                                accept: true
                            },
                            {
                                items: [
                                    {
                                        accept: false
                                    }
                                ]
                            }
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

                it("throws when canAccept returns an error", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [TestRequestItem.from({ mustBeAccepted: false, shouldFailAtCanAccept: true })]
                        },
                        status: LocalRequestStatus.DecisionRequired
                    })
                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot accept the Request with the given parameters. Call 'canAccept' to get more information."
                    )
                })

                it("throws when no Local Request with the given id exists in DB", async function () {
                    When.iTryToAcceptWith({ requestId: "nonExistentId" })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when at least one RequestItemProcessor throws", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [TestRequestItem.from({ mustBeAccepted: false, shouldThrowOnAccept: true })]
                        },
                        status: LocalRequestStatus.DecisionRequired
                    })

                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "An error occurred while processing a 'TestRequestItem'*Details: Accept failed for testing purposes*"
                    )
                })

                it("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToAccept()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToAcceptARequestWithoutItemsParameters()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                })
            })

            describe("Reject", function () {
                it("can handle valid input", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iRejectTheRequest()
                    await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Rejected)
                    await Then.theRequestMovesToStatus(LocalRequestStatus.Decided)
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iRejectTheRequest({
                        items: [
                            {
                                accept: false
                            },
                            {
                                items: [
                                    {
                                        accept: false
                                    }
                                ]
                            }
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
                    await Given.anIncomingRequestWithAnItemAndAGroupInStatus(LocalRequestStatus.DecisionRequired)
                    await When.iRejectTheRequest({
                        items: [
                            {
                                accept: false
                            },
                            {
                                items: [
                                    {
                                        accept: false
                                    }
                                ]
                            }
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

                it("throws when canReject returns an error", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [TestRequestItem.from({ mustBeAccepted: false, shouldFailAtCanReject: true })]
                        },
                        status: LocalRequestStatus.DecisionRequired
                    })
                    await When.iTryToReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "Cannot reject the Request with the given parameters. Call 'canReject' to get more information."
                    )
                })

                it("throws when no Local Request with the given id exists in DB", async function () {
                    When.iTryToRejectWith({ requestId: "nonExistentId" })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when at least one RequestItemProcessor throws", async function () {
                    await Given.anIncomingRequestWith({
                        content: {
                            items: [TestRequestItem.from({ mustBeAccepted: false, shouldThrowOnReject: true })]
                        },
                        status: LocalRequestStatus.DecisionRequired
                    })

                    await When.iTryToReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "An error occurred while processing a 'TestRequestItem'*Details: Reject failed for testing purposes*"
                    )
                })

                it("throws when the Local Request is not in status 'DecisionRequired/ManualDecisionRequired'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToReject()
                    await Then.itThrowsAnErrorWithTheErrorMessage(
                        "*Local Request has to be in status 'DecisionRequired/ManualDecisionRequired'*"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToAcceptARequestWithoutItemsParameters()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*items*Value is not defined*")
                })
            })

            describe("Complete", function () {
                it("can handle valid input with a Message as responseSource", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Decided)
                    await When.iCompleteTheIncomingRequestWith({
                        responseSourceObject: TestObjectFactory.createOutgoingIMessage(context.currentIdentity)
                    })
                    await Then.theRequestMovesToStatus(LocalRequestStatus.Completed)
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" })
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("can handle valid input with a RelationshipChange as responseSource", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Decided)
                    const outgoingRelationshipCreationChange = TestObjectFactory.createOutgoingIRelationshipChange(
                        RelationshipChangeType.Creation,
                        context.currentIdentity
                    )
                    await When.iCompleteTheIncomingRequestWith({
                        responseSourceObject: outgoingRelationshipCreationChange
                    })
                    await Then.theRequestMovesToStatus(LocalRequestStatus.Completed)
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "RelationshipChange" })
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("throws on syntactically invalid input", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Decided)
                    await When.iTryToCompleteTheIncomingRequestWithoutResponseSource()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*responseSource*Value is not defined*")
                })

                it("throws when the Local Request is not in status 'Decided'", async function () {
                    await Given.anIncomingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToCompleteTheIncomingRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Decided'*")
                })

                it("throws when no Local Request with the given id exists in DB", async function () {
                    const nonExistentId = CoreId.from("nonExistentId")
                    await When.iTryToCompleteTheIncomingRequestWith({ requestId: nonExistentId })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })
            })

            describe("GetRequest", function () {
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

            describe("GetIncomingRequests", function () {
                it("returns all incoming Requests when invoked with no query", async function () {
                    await Given.anIncomingRequest()
                    await Given.anIncomingRequest()
                    await When.iGetIncomingRequestsWithTheQuery({})
                    await Then.theNumberOfReturnedRequestsIs(2)
                })

                it("does not return outgoing Requests", async function () {
                    await Given.anIncomingRequest()
                    await Given.anOutgoingRequest()
                    await When.iGetIncomingRequestsWithTheQuery({})
                    await Then.theNumberOfReturnedRequestsIs(1)
                })

                it("filters Requests based on given query", async function () {
                    await Given.anIncomingRequestWith({ status: LocalRequestStatus.Open })
                    await Given.anIncomingRequestWith({ status: LocalRequestStatus.Open })
                    await Given.anIncomingRequestWith({ status: LocalRequestStatus.DecisionRequired })
                    await When.iGetIncomingRequestsWithTheQuery({ status: LocalRequestStatus.Open })
                    await Then.theNumberOfReturnedRequestsIs(2)
                })
            })

            describe("Flows for incoming Requests", function () {
                it("Incoming Request via RelationshipTemplate", async function () {
                    const request = Request.from({
                        items: [TestRequestItem.from({ mustBeAccepted: false })]
                    })
                    const template = TestObjectFactory.createIncomingIRelationshipTemplate()

                    let cnsRequest = await context.incomingRequestsController.received({
                        receivedRequest: request,
                        requestSourceObject: template
                    })

                    cnsRequest = await context.incomingRequestsController.checkPrerequisites({
                        requestId: cnsRequest.id
                    })

                    cnsRequest = await context.incomingRequestsController.requireManualDecision({
                        requestId: cnsRequest.id
                    })
                    cnsRequest = await context.incomingRequestsController.accept({
                        requestId: cnsRequest.id.toString(),
                        items: [
                            {
                                accept: true
                            }
                        ]
                    })

                    const relationshipChange = TestObjectFactory.createOutgoingIRelationshipChange(
                        RelationshipChangeType.Creation,
                        context.currentIdentity
                    )

                    cnsRequest = await context.incomingRequestsController.complete({
                        requestId: cnsRequest.id,
                        responseSourceObject: relationshipChange
                    })

                    expect(cnsRequest).to.exist
                })

                it("Incoming Request via Message", async function () {
                    const request = Request.from({
                        id: await CoreId.generate(),
                        items: [TestRequestItem.from({ mustBeAccepted: false })]
                    })
                    const incomingMessage = TestObjectFactory.createIncomingIMessage(context.currentIdentity)

                    let cnsRequest = await context.incomingRequestsController.received({
                        receivedRequest: request,
                        requestSourceObject: incomingMessage
                    })

                    cnsRequest = await context.incomingRequestsController.checkPrerequisites({
                        requestId: cnsRequest.id
                    })

                    cnsRequest = await context.incomingRequestsController.requireManualDecision({
                        requestId: cnsRequest.id
                    })
                    cnsRequest = await context.incomingRequestsController.accept({
                        requestId: cnsRequest.id.toString(),
                        items: [
                            {
                                accept: true
                            }
                        ]
                    })

                    const responseMessage = TestObjectFactory.createOutgoingIMessage(context.currentIdentity)

                    cnsRequest = await context.incomingRequestsController.complete({
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
    public override validate(_params: DecideRequestParametersJSON, _request: LocalRequest): ValidationResult {
        return ValidationResult.success()
    }
}
