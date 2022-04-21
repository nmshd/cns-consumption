import { Result } from "@js-soft/ts-utils"
import {
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestParametersValidator,
    ErrorValidationResult,
    ICreateOutgoingRequestParameters,
    IDecideRequestParameters,
    IRequestWithoutId,
    ValidationResult
} from "@nmshd/consumption"
import {
    AcceptResponseItem,
    IAcceptResponseItem,
    IRequest,
    IRequestItemGroup,
    IResponse,
    IResponseItemGroup,
    Request,
    RequestItemGroup,
    Response,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content"
import { AccountController, CoreId, RelationshipChangeType, Transport } from "@nmshd/transport"
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

export class AlwaysTrueDecideRequestParamsValidator extends DecideRequestParametersValidator {
    public override validate(_params: IDecideRequestParameters, _request: ConsumptionRequest): Result<undefined> {
        return Result.ok(undefined)
    }
}

export class OutgoingRequestControllerTests extends RequestsIntegrationTest {
    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.loggerFactory)
        let accountController: AccountController
        let consumptionController: ConsumptionController
        let context: RequestsTestsContext | undefined

        describe("OutgoingRequestController", function () {
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

                context = new RequestsTestsContext(accountController, consumptionController)
                that.init(context)
                Given = that.Given
                When = that.When
                Then = that.Then
            })

            afterEach(function () {
                context?.reset()
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
                                peer: CoreId.from("")
                            },
                            expectedErrorMessage: "*content*Value is not defined*"
                        },
                        {
                            params: {
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
                    expect((validationResult as ErrorValidationResult).code).to.equal("inheritedFromItem")
                    expect((validationResult as ErrorValidationResult).message).to.equal(
                        "Some child items have errors."
                    )
                    expect(validationResult.items).to.have.lengthOf(2)

                    expect(validationResult.items[0].isError()).to.be.true
                    expect((validationResult.items[0] as ErrorValidationResult).code).to.equal("aCode")
                    expect((validationResult.items[0] as ErrorValidationResult).message).to.equal("aMessage")

                    expect(validationResult.items[1].isError()).to.be.true
                    expect((validationResult.items[1] as ErrorValidationResult).code).to.equal("aCode")
                    expect((validationResult.items[1] as ErrorValidationResult).message).to.equal("aMessage")
                })

                it("returns a validation result that contains each error (complex)", async function () {
                    const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                        content: {
                            items: [
                                await TestRequestItem.from({
                                    mustBeAccepted: false
                                }),
                                await RequestItemGroup.from({
                                    mustBeAccepted: false,
                                    items: [
                                        await TestRequestItem.from({
                                            mustBeAccepted: false,
                                            shouldFailAtCanCreateOutgoingRequestItem: true
                                        })
                                    ]
                                })
                            ]
                        }
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

                    expect(validationResult.items[1].items).to.have.lengthOf(1)
                    expect(validationResult.items[1].items[0].isError()).to.be.true
                })
            })

            describe("Create", function () {
                it("can handle valid input", async function () {
                    await When.iCreateAnOutgoingRequest()
                    await Then.theCreatedOutgoingRequestHasAllProperties()
                    await Then.theRequestIsInStatus(ConsumptionRequestStatus.Draft)
                    await Then.theRequestDoesNotHaveSourceSet()
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("calls canCreate", async function () {
                    await When.iCreateAnOutgoingRequest()
                    await Then.canCreateIsBeingCalled()
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCreateAnOutgoingRequestWithoutContent()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*content*Value is not defined*")
                })

                it("throws when canCreate returns an error", async function () {
                    const oldCanCreate = consumptionController.outgoingRequests.canCreate
                    consumptionController.outgoingRequests.canCreate = (_: ICreateOutgoingRequestParameters) => {
                        return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
                    }

                    await When.iTryToCreateAnOutgoingRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("aMessage")

                    consumptionController.outgoingRequests.canCreate = oldCanCreate
                })
            })

            describe("Sent", function () {
                it("can handle valid input", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iCallSent()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Open)
                    await Then.theRequestHasItsSourcePropertySet()
                    await Then.theChangesArePersistedInTheDatabase()
                })

                it("throws on syntactically invalid input", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iTryToCallSentWithoutSourceObject()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*requestSourceObject*Value is not defined*")
                })

                it("throws when the Consumption Request is not in status 'Draft' ", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCallSent()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Consumption Request has to be in status 'Draft'*")
                })

                const paramsWithValidSources = [
                    {
                        sourceObjectFactory: TestObjectFactory.createOutgoingIMessage,
                        expectedSourceType: "Message"
                    },
                    {
                        sourceObjectFactory: TestObjectFactory.createOutgoingIRelationshipTemplate,
                        expectedSourceType: "RelationshipTemplate"
                    }
                ]
                itParam(
                    "sets the source property depending on the given source",
                    paramsWithValidSources,
                    async function (testParams) {
                        const source = testParams.sourceObjectFactory(accountController.identity.address)

                        await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                        await When.iCallSentWith({ requestSourceObject: source })
                        await Then.theRequestHasItsSourcePropertySetTo({
                            type: testParams.expectedSourceType as any,
                            reference: source.id
                        })
                    }
                )

                it("throws when no Request with the given id exists in DB", async function () {
                    await When.iTryToCallSentWith({ requestId: CoreId.from("nonExistentId") })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                const paramsWithInvalidSources = [
                    {
                        description: "an incmoming Message",
                        sourceObjectFactory: TestObjectFactory.createIncomingIMessage,
                        expectedSourceType: "Message"
                    },
                    {
                        description: "an incmoming RelationshipTemplate",
                        sourceObjectFactory: TestObjectFactory.createIncomingIRelationshipTemplate,
                        expectedSourceType: "RelationshipTemplate"
                    }
                ]
                itParam(
                    "throws when passing ${value.description}",
                    paramsWithInvalidSources,
                    async function (testParams) {
                        const invalidSource = testParams.sourceObjectFactory(accountController.identity.address)

                        await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                        await When.iTryToCallSentWith({ requestSourceObject: invalidSource })
                        await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create outgoing Request from a peer*")
                    }
                )
            })

            describe("Complete", function () {
                it("can handle valid input with a Message as responseSourceObject", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Open)
                    const incomingMessage = TestObjectFactory.createIncomingIMessage(accountController.identity.address)
                    await When.iCompleteTheOutgoingRequestWith({
                        responseSourceObject: incomingMessage
                    })
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "Message" })
                    await Then.theNewRequestIsPersistedInTheDatabase()
                })

                it("can handle valid input with a RelationshipChange as responseSourceObject", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Open)
                    const incomingRelationshipCreationChange = TestObjectFactory.createIncomingIRelationshipChange(
                        RelationshipChangeType.Creation
                    )
                    await When.iCompleteTheOutgoingRequestWith({
                        responseSourceObject: incomingRelationshipCreationChange
                    })
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
                    await Then.theResponseHasItsSourcePropertySetCorrectly({ responseSourceType: "RelationshipChange" })
                    await Then.theNewRequestIsPersistedInTheDatabase()
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
                            status: ConsumptionRequestStatus.Open,
                            content: testParams.request
                        })
                        await When.iCompleteTheOutgoingRequestWith({ receivedResponse: testParams.response })
                        await Then.applyIncomingResponseItemIsCalledOnTheRequestItemProcessor(testParams.numberOfCalls)
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
                            status: ConsumptionRequestStatus.Open,
                            content: testParams.request
                        })
                        await When.iTryToCompleteTheOutgoingRequestWith({ receivedResponse: testParams.response })
                        await Then.itThrowsAnErrorWithTheErrorMessage("aMessage")
                    }
                )

                it("throws on syntactically invalid input", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Open)
                    await When.iTryToCallCompleteWithoutSourceObject()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*responseSourceObject*Value is not defined*")
                })

                it("throws when no Request with the given id exists in DB", async function () {
                    await When.iTryToCompleteTheOutgoingRequestWith({ requestId: CoreId.from("nonExistentId") })
                    await Then.itThrowsAnErrorWithTheErrorCode("error.transport.recordNotFound")
                })

                it("throws when the Consumption Request is not in status 'Open'", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iTryToCompleteTheOutgoingRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*Consumption Request has to be in status 'Open'*")
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

            describe("Flows for outgoing Requests", function () {
                it("Outgoing Request via RelationshipTemplate", async function () {
                    const request = await Request.from({
                        items: [await TestRequestItem.from({ mustBeAccepted: false })]
                    })
                    const template = TestObjectFactory.createOutgoingIRelationshipTemplate(
                        accountController.identity.address
                    )

                    const canCreate = await consumptionController.outgoingRequests.canCreate({
                        content: request,
                        peer: template.cache!.createdBy
                    })
                    expect(canCreate.isSuccess()).to.be.true

                    let cnsRequest = await consumptionController.outgoingRequests.create({
                        content: request,
                        peer: template.cache!.createdBy
                    })

                    cnsRequest = await consumptionController.outgoingRequests.sent({
                        requestId: cnsRequest.id,
                        requestSourceObject: template
                    })

                    cnsRequest = await consumptionController.outgoingRequests.complete({
                        requestId: cnsRequest.id,
                        receivedResponse: await Response.from({
                            requestId: cnsRequest.id,
                            result: ResponseResult.Accepted,
                            items: [await AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
                        }),
                        responseSourceObject: TestObjectFactory.createOutgoingIRelationshipChange(
                            RelationshipChangeType.Creation,
                            accountController.identity.address
                        )
                    })

                    expect(cnsRequest).to.exist
                })

                it("Outgoing Request via Message", async function () {
                    const request = await Request.from({
                        id: await CoreId.generate(),
                        items: [await TestRequestItem.from({ mustBeAccepted: false })]
                    })
                    const incomingMessage = TestObjectFactory.createOutgoingIMessage(accountController.identity.address)

                    const canCreate = await consumptionController.outgoingRequests.canCreate({
                        content: request,
                        peer: incomingMessage.cache!.createdBy
                    })
                    expect(canCreate.isSuccess()).to.be.true

                    let cnsRequest = await consumptionController.outgoingRequests.create({
                        content: request,
                        peer: incomingMessage.cache!.createdBy
                    })

                    cnsRequest = await consumptionController.outgoingRequests.sent({
                        requestId: cnsRequest.id,
                        requestSourceObject: incomingMessage
                    })

                    cnsRequest = await consumptionController.outgoingRequests.complete({
                        requestId: cnsRequest.id,
                        receivedResponse: await Response.from({
                            requestId: cnsRequest.id,
                            result: ResponseResult.Accepted,
                            items: [await AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
                        }),
                        responseSourceObject: TestObjectFactory.createIncomingIMessage(
                            accountController.identity.address
                        )
                    })

                    expect(cnsRequest).to.exist
                })
            })
        })
    }
}
