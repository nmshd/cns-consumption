import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
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
import { RequestItemGroup } from "@nmshd/content"
import { AccountController, CoreId, IConfigOverwrite, Transport } from "@nmshd/transport"
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
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class AlwaysTrueDecideRequestParamsValidator extends DecideRequestParametersValidator {
    public override validate(_params: IDecideRequestParameters, _request: ConsumptionRequest): Result<undefined> {
        return Result.ok(undefined)
    }
}

export class OutgoingRequestControllerTests extends RequestsIntegrationTest {
    public constructor(
        protected override config: IConfigOverwrite,
        protected override connection: IDatabaseConnection,
        protected override loggerFactory: ILoggerFactory
    ) {
        super(config, connection, loggerFactory)
    }

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
                accountController = (await TestUtil.provideAccounts(transport, 1))[0]
                consumptionController = await new ConsumptionController(transport, accountController).init()

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

                const syntacticallyInvalidParams = [
                    {
                        params: {
                            peer: CoreId.from("")
                        },
                        expectedErrorMessage: "*request*Value is not defined*"
                    },
                    {
                        params: {
                            peer: CoreId.from(""),
                            request: {}
                        },
                        expectedErrorMessage: "*Request.items*Value is not defined*"
                    }
                ]
                itParam(
                    "throws on syntactically invalid input",
                    syntacticallyInvalidParams,
                    async function (testParams) {
                        await When.iTryToCallCanCreateForAnOutgoingRequest(testParams.params as any)
                        await Then.itThrowsAnErrorWithTheErrorMessage(testParams.expectedErrorMessage)
                    }
                )

                const requestsWithOneInvalidItem: IRequestWithoutId[] = [
                    {
                        items: [
                            {
                                // @ts-expect-error
                                "@type": "TestRequestItem",
                                mustBeAccepted: false,
                                shouldFailAtValidation: true
                            }
                        ]
                    },
                    {
                        items: [
                            {
                                // @ts-expect-error
                                "@type": "TestRequestItem",
                                mustBeAccepted: false,
                                shouldFailAtValidation: false
                            },
                            {
                                // @ts-expect-error
                                "@type": "TestRequestItem",
                                mustBeAccepted: false,
                                shouldFailAtValidation: true
                            }
                        ]
                    },
                    {
                        items: [
                            {
                                "@type": "RequestItemGroup",
                                mustBeAccepted: false,
                                items: [
                                    {
                                        // @ts-expect-error
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        shouldFailAtValidation: true
                                    }
                                ]
                            }
                        ]
                    }
                ]
                itParam(
                    "returns 'error' when at least one RequestItem is invalid",
                    requestsWithOneInvalidItem,
                    async function (request: IRequestWithoutId) {
                        await When.iCallCanCreateForAnOutgoingRequest({
                            request: request
                        })
                        await Then.itReturnsAnErrorValidationResult()
                    }
                )

                it("returns a validation result that contains each error (simple)", async function () {
                    const validationResult = await When.iCallCanCreateForAnOutgoingRequest({
                        request: {
                            items: [
                                {
                                    // @ts-expect-error
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtValidation: true
                                },
                                {
                                    // @ts-expect-error
                                    "@type": "TestRequestItem",
                                    mustBeAccepted: false,
                                    shouldFailAtValidation: true
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
                        request: {
                            items: [
                                await TestRequestItem.from({
                                    mustBeAccepted: false
                                }),
                                await RequestItemGroup.from({
                                    mustBeAccepted: false,
                                    items: [
                                        await TestRequestItem.from({
                                            mustBeAccepted: false,
                                            shouldFailAtValidation: true
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
                    await Then.canAcceptIsBeingCalled()
                })

                it("throws on syntactically invalid input", async function () {
                    await When.iTryToCreateAnOutgoingRequestWithoutRequest()
                    await Then.itThrowsAnErrorWithTheErrorMessage("*request*Value is not defined*")
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
                        await When.iCallSentWith({ sourceObject: source })
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
                        await When.iTryToCallSentWith({ sourceObject: invalidSource })
                        await Then.itThrowsAnErrorWithTheErrorMessage("Cannot create outgoing Request from a peer*")
                    }
                )
            })

            describe("CompleteOutgoingRequest", function () {
                it("can handle valid input", async function () {
                    await Given.anOutgoingRequestInStatus(ConsumptionRequestStatus.Draft)
                    await When.iCompleteTheOutgoingRequest()
                    await Then.theRequestMovesToStatus(ConsumptionRequestStatus.Completed)
                    await Then.theRequestHasItsResponsePropertySetCorrectly()
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
