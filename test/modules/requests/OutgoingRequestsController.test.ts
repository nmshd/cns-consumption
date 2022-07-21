import { ApplicationError } from "@js-soft/ts-utils"
import {
    ConsumptionIds,
    DecideRequestParametersJSON,
    DecideRequestParametersValidator,
    ErrorValidationResult,
    ICreateOutgoingRequestParameters,
    IRequestWithoutId,
    LocalRequest,
    LocalRequestStatus,
    ValidationResult
} from "@nmshd/consumption"
import {
    IAcceptResponseItem,
    IRequest,
    IRequestItemGroup,
    IResponse,
    IResponseItemGroup,
    RequestItemGroup,
    ResponseItemResult,
    ResponseResult
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

export class AlwaysTrueDecideRequestParamsValidator extends DecideRequestParametersValidator {
    public override validate(_params: DecideRequestParametersJSON, _request: LocalRequest): ValidationResult {
        return ValidationResult.success()
    }
}

export class OutgoingRequestsControllerTests extends RequestsIntegrationTest {
    public run(): void {
        const that = this
        let context: RequestsTestsContext

        describe("OutgoingRequestsController", function () {
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

            describe("CanCreate", function () {
                it("returns 'success' on valid parameters", async function () {
                    await When.iCallCanCreateForAnOutgoingRequest()
                    await Then.itReturnsASuccessfulValidationResult()
                })

                itParam(
                    "throws on syntactically invalid input",
                    [
                        {
                            params: {
                                isPersonalized: true,
                                peer: CoreId.from("")
                            },
                            expectedErrorMessage: "*content*Value is not defined*"
                        },
                        {
                            params: {
                                isPersonalized: true,
                                peer: CoreId.from(""),
                                content: {}
                            },
                            expectedErrorMessage: "*Request.items*Value is not defined*"
                        }
                    ],
                    async function (testParams) {
                        await When.iTryToCallCanCreateForAnOutgoingRequest(testParams.params as any)
                        await Then.itThrowsAnErrorWithTheErrorMessage(testParams.expectedErrorMessage)
                    }
                )

                itParam(
                    "returns 'error' when at least one RequestItem is invalid",
                    [
                        {
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanCreateOutgoingRequestItem: true
                                } as ITestRequestItem
                            ]
                        } as IRequest,
                        {
                            items: [
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false
                                } as ITestRequestItem,
                                {
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanCreateOutgoingRequestItem: true
                                } as ITestRequestItem
                            ]
                        } as IRequest,
                        {
                            items: [
                                {
                                    "@type": "RequestItemGroup",
                                    mustBeAccepted: false,
                                    items: [
                                        {
                                            "@type": "TestRequestItem",
                                            mustBeAccepted: false,
                                            shouldFailAtCanCreateOutgoingRequestItem: true
                                        } as ITestRequestItem
                                    ]
                                } as IRequestItemGroup
                            ]
                        } as IRequest
                    ],
                    async function (request: IRequestWithoutId) {
                        await When.iCallCanCreateForAnOutgoingRequest({
                            content: request
                        })
                        await Then.itReturnsAnErrorValidationResult()
                    }
                )

                it("returns a validation result that contains each error (simple)", async function () {
                    const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                        content: {
                            items: [
                                {
                                    // @ts-expect-error
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanCreateOutgoingRequestItem: true
                                },
                                {
                                    // @ts-expect-error
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtCanCreateOutgoingRequestItem: true
                                }
                            ]
                        }
                    })
                    expect(validationResult.isError()).to.be.true
                    expect((validationResult as ErrorValidationResult).error.code).to.equal("inheritedFromItem")
                    expect((validationResult as ErrorValidationResult).error.message).to.equal(
                        "Some child items have errors."
                    )
                    expect(validationResult.items).to.have.lengthOf(2)

                    expect(validationResult.items[0].isError()).to.be.true
                    expect((validationResult.items[0] as ErrorValidationResult).error.code).to.equal("aCode")
                    expect((validationResult.items[0] as ErrorValidationResult).error.message).to.equal("aMessage")

                    expect(validationResult.items[1].isError()).to.be.true
                    expect((validationResult.items[1] as ErrorValidationResult).error.code).to.equal("aCode")
                    expect((validationResult.items[1] as ErrorValidationResult).error.message).to.equal("aMessage")
                })

                it("returns a validation result that contains each error (complex)", async function () {
                    const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                        content: {
                            items: [
                                TestRequestItem.from({
                                    mustBeAccepted: false
                                }),
                                RequestItemGroup.from({
                                    mustBeAccepted: false,
                                    items: [
                                        TestRequestItem.from({
                                            mustBeAccepted: false,
                                            shouldFailAtCanCreateOutgoingRequestItem: true
                                        })
                                    ]
                                })
                            ]
                        }
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

                    expect(validationResult.items[1].items).to.have.lengthOf(1)
                    expect(validationResult.items[1].items[0].isError()).to.be.true
                })
            })

            describe("Create", function () {
                it("can handle valid input", async function () {
                    await When.iCreateAnOutgoingRequest()
                    await Then.theCreatedOutgoingRequestHasAllProperties()
                    await Then.theRequestIsInStatus(LocalRequestStatus.Draft)
                    await Then.theRequestDoesNotHaveSourceSet()
                    await Then.theNewRequestIsPersistedInTheDatabase()
                    await Then.eventHasBeenPublished("consumption.outgoingRequestCreated")
                })

                it("calls canCreate", async function () {
                    await When.iCreateAnOutgoingRequest()
                    await Then.canCreateIsBeingCalled()
                    await Then.eventHasBeenPublished("consumption.outgoingRequestCreated")
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCreateAnOutgoingRequestWithoutContent()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*content*Value is not defined*")
                })

                it("throws when canCreate returns an error", async function () {
                    const oldCanCreate = context.outgoingRequestsController.canCreate
                    context.outgoingRequestsController.canCreate = (_: ICreateOutgoingRequestParameters) => {
                        return Promise.resolve(ValidationResult.error(new ApplicationError("aCode", "aMessage")))
                    }

                    When.iTryToCreateAnOutgoingRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("aMessage")

                    context.outgoingRequestsController.canCreate = oldCanCreate
                })
            })

            describe("CreateFromRelationshipCreationChange", function () {
                it("combines calls to create, sent and complete", async function () {
                    await When.iCreateAnOutgoingRequestFromRelationshipCreationChange()
                    await Then.theCreatedOutgoingRequestHasAllProperties()
                    await Then.theRequestIsInStatus(LocalRequestStatus.Completed)
                    await Then.theRequestHasItsSourcePropertySet()
                    await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted)
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "RelationshipChange" })
                    await Then.theNewRequestIsPersistedInTheDatabase()
                    await Then.eventHasBeenPublished(
                        "consumption.outgoingRequestFromRelationshipCreationChangeCreatedAndCompleted"
                    )
                })

                it("uses the id from the Creation Change content for the created Local Request", async function () {
                    await When.iCreateAnOutgoingRequestFromRelationshipCreationChangeWith({
                        creationChange: TestObjectFactory.createIncomingIRelationshipChange(
                            RelationshipChangeType.Creation,
                            "requestIdReceivedFromPeer"
                        )
                    })
                    await Then.theRequestHasTheId("requestIdReceivedFromPeer")
                    await Then.eventHasBeenPublished(
                        "consumption.outgoingRequestFromRelationshipCreationChangeCreatedAndCompleted"
                    )
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCreateAnOutgoingRequestFromCreationChangeWithoutCreationChange()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*creationChange*Value is not defined*")
                })
            })

            describe("Sent", function () {
                it("can handle valid input", async function () {
                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft)
                    await When.iCallSent()
                    await Then.theRequestMovesToStatus(LocalRequestStatus.Open)
                    await Then.theRequestHasItsSourcePropertySet()
                    await Then.theChangesArePersistedInTheDatabase()
                    await Then.eventHasBeenPublished("consumption.outgoingRequestStatusChanged", {
                        newStatus: LocalRequestStatus.Open
                    })
                })

                it("throws on syntactically invalid input", async function () {
                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft)
                    await When.iTryToCallSentWithoutSourceObject()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestSourceObject*Value is not defined*")
                })

                it("throws when the Local Request is not in status 'Draft' ", async function () {
                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open)
                    When.iTryToCallSent()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Draft'*")
                })

                it("sets the source property depending on the given source", async function () {
                    const source = TestObjectFactory.createOutgoingIMessage(context.currentIdentity)

                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft)
                    await When.iCallSentWith({ requestSourceObject: source })
                    await Then.theRequestHasItsSourcePropertySetTo({
                        type: "Message",
                        reference: source.id
                    })
                    await Then.eventHasBeenPublished("consumption.outgoingRequestStatusChanged", {
                        newStatus: LocalRequestStatus.Open
                    })
                })

                it("throws when no Request with the given id exists in DB", async function () {
                    When.iTryToCallSentWith({ requestId: CoreId.from("nonExistentId") })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when passing an incoming Message", async function () {
                    const invalidSource = TestObjectFactory.createIncomingIMessage(context.currentIdentity)

                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft)
                    When.iTryToCallSentWith({ requestSourceObject: invalidSource })
                    await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create outgoing Request from a peer*")
                })
            })

            describe("Complete", function () {
                it("can handle valid input with a Message as responseSourceObject", async function () {
                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open)
                    const incomingMessage = TestObjectFactory.createIncomingIMessage(context.currentIdentity)
                    await When.iCompleteTheOutgoingRequestWith({
                        responseSourceObject: incomingMessage
                    })
                    await Then.theRequestMovesToStatus(LocalRequestStatus.Completed)
                    await Then.theRequestHasItsResponsePropertySetCorrectly(ResponseItemResult.Accepted)
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" })
                    await Then.theNewRequestIsPersistedInTheDatabase()
                    await Then.eventHasBeenPublished("consumption.outgoingRequestStatusChanged", {
                        newStatus: LocalRequestStatus.Completed
                    })
                })

                itParam(
                    "calls applyIncomingResponseItem on the RequestItemProcessor of RequestItems",
                    [
                        // 1 item
                        {
                            request: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            response: {
                                result: ResponseResult.Accepted,
                                items: [
                                    {
                                        "@type": "AcceptResponseItem",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptResponseItem
                                ]
                            } as Omit<IResponse, "id">,
                            numberOfCalls: 1
                        },
                        // 2 items
                        {
                            request: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    } as ITestRequestItem,
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            response: {
                                result: ResponseResult.Accepted,
                                items: [
                                    {
                                        "@type": "AcceptResponseItem",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptResponseItem,
                                    {
                                        "@type": "AcceptResponseItem",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptResponseItem
                                ]
                            } as Omit<IResponse, "id">,
                            numberOfCalls: 2
                        },
                        // 1 item and 1 group with 1 item
                        {
                            request: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    } as ITestRequestItem,
                                    {
                                        "@type": "RequestItemGroup",
                                        mustBeAccepted: false,
                                        items: [
                                            {
                                                "@type": "TestRequestItem",
                                                mustBeAccepted: false
                                            } as ITestRequestItem
                                        ]
                                    } as IRequestItemGroup
                                ]
                            } as IRequest,
                            response: {
                                result: ResponseResult.Accepted,
                                items: [
                                    {
                                        "@type": "AcceptResponseItem",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptResponseItem,
                                    {
                                        "@type": "ResponseItemGroup",
                                        items: [
                                            {
                                                "@type": "AcceptResponseItem",
                                                result: ResponseItemResult.Accepted
                                            } as IAcceptResponseItem
                                        ]
                                    } as IResponseItemGroup
                                ]
                            } as Omit<IResponse, "id">,
                            numberOfCalls: 2
                        }
                    ],
                    async function (testParams) {
                        await Given.anOutgoingRequestWith({
                            status: LocalRequestStatus.Open,
                            content: testParams.request
                        })
                        await When.iCompleteTheOutgoingRequestWith({ receivedResponse: testParams.response })
                        await Then.applyIncomingResponseItemIsCalledOnTheRequestItemProcessor(testParams.numberOfCalls)
                        await Then.eventHasBeenPublished("consumption.outgoingRequestStatusChanged", {
                            newStatus: LocalRequestStatus.Completed
                        })
                    }
                )

                itParam(
                    "throws when an ItemProcessor returns an error validation result",
                    [
                        // 1 item with error
                        {
                            request: {
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        shouldFailAtCanApplyIncomingResponseItem: true
                                    } as ITestRequestItem
                                ]
                            } as IRequest,
                            response: {
                                result: ResponseResult.Accepted,
                                items: [
                                    {
                                        "@type": "AcceptResponseItem",
                                        result: ResponseItemResult.Accepted
                                    } as IAcceptResponseItem
                                ]
                            } as Omit<IResponse, "id">
                        },
                        // 1 item group with 1 item with error
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
                                                shouldFailAtCanApplyIncomingResponseItem: true
                                            } as ITestRequestItem
                                        ]
                                    } as IRequestItemGroup
                                ]
                            } as IRequest,
                            response: {
                                result: ResponseResult.Accepted,
                                items: [
                                    {
                                        "@type": "ResponseItemGroup",
                                        items: [
                                            {
                                                "@type": "AcceptResponseItem",
                                                result: ResponseItemResult.Accepted
                                            } as IAcceptResponseItem
                                        ]
                                    } as IResponseItemGroup
                                ]
                            } as Omit<IResponse, "id">
                        }
                    ],
                    async function (testParams) {
                        await Given.anOutgoingRequestWith({
                            status: LocalRequestStatus.Open,
                            content: testParams.request
                        })
                        When.iTryToCompleteTheOutgoingRequestWith({ receivedResponse: testParams.response })
                        await Then.itThrowsAnErrorWithTheErrorMessage("aMessage")
                    }
                )

                it("throws on syntactically invalid input", async function () {
                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Open)
                    await When.iTryToCallCompleteWithoutSourceObject()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*responseSourceObject*Value is not defined*")
                })

                it("throws when no Request with the given id exists in DB", async function () {
                    When.iTryToCompleteTheOutgoingRequestWith({ requestId: CoreId.from("nonExistentId") })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when the Local Request is not in status 'Open'", async function () {
                    await Given.anOutgoingRequestInStatus(LocalRequestStatus.Draft)
                    When.iTryToCompleteTheOutgoingRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Local Request has to be in status 'Open'*")
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

            describe("GetOutgoingRequests", function () {
                it("returns all outgoing Requests when invoked with no query", async function () {
                    await Given.anOutgoingRequest()
                    await Given.anOutgoingRequest()
                    await When.iGetOutgoingRequestsWithTheQuery({})
                    await Then.theNumberOfReturnedRequestsIs(2)
                })

                it("does not return outgoing Requests", async function () {
                    await Given.anOutgoingRequest()
                    await Given.anIncomingRequest()
                    await When.iGetOutgoingRequestsWithTheQuery({})
                    await Then.theNumberOfReturnedRequestsIs(1)
                })

                it("filters Requests based on given query", async function () {
                    await Given.anOutgoingRequestWith({ status: LocalRequestStatus.Draft })
                    await Given.anOutgoingRequestWith({ status: LocalRequestStatus.Draft })
                    await Given.anOutgoingRequestWith({ status: LocalRequestStatus.Open })
                    await When.iGetOutgoingRequestsWithTheQuery({ status: LocalRequestStatus.Draft })
                    await Then.theNumberOfReturnedRequestsIs(2)
                })
            })
        })
    }
}
