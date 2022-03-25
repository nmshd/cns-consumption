import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { Result } from "@js-soft/ts-utils"
import {
    CompleteRequestParams,
    CompleteRequestParamsValidator,
    ConsumptionController,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    ConsumptionResponseDraft,
    RequestItemDecision,
    RequestsController
} from "@nmshd/consumption"
import { Request, ResponseItem, ResponseItemGroup, ResponseItemResult } from "@nmshd/content"
import { AccountController, CoreId, IConfigOverwrite, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

export class AlwaysTrueCompleteRequestParamsValidator extends CompleteRequestParamsValidator {
    public validate(_params: CompleteRequestParams, _request: ConsumptionRequest): Result<undefined> {
        return Result.ok(undefined)
    }
}

export class RequestControllerTests extends IntegrationTest {
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

        before(async function () {
            await TestUtil.clearAccounts(that.connection)
            await transport.init()
            const accountController = (await TestUtil.provideAccounts(transport, 1))[0]
            const consumptionController = await new ConsumptionController(transport, accountController).init()

            ;(consumptionController.requests as any).completeRequestParamsValidator =
                new AlwaysTrueCompleteRequestParamsValidator()

            defaultAccount = {
                accountController,
                consumptionController
            }
        })

        describe("RequestController", function () {
            it("is initialized at startup", function () {
                expect(defaultAccount.consumptionController.requests).to.be.instanceOf(RequestsController)
            })

            describe("CreateIncomingRequest", function () {
                it("creates an incoming Request with an incoming Message as source", async function () {
                    const requestSource = await TestObjectFactory.createIncomingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: request,
                            source: requestSource
                        })

                    expect(consumptionRequest).to.be.instanceOf(ConsumptionRequest)
                    expect(consumptionRequest.id).to.exist
                    expect(consumptionRequest.createdAt).to.exist
                    expect(consumptionRequest.isOwn).to.be.false
                    expect(consumptionRequest.peer).to.equal(requestSource.cache!.createdBy)
                    expect(consumptionRequest.sourceReference.toString()).to.equal(requestSource.id.toString())
                    expect(consumptionRequest.sourceType).to.equal("Message")
                    expect(consumptionRequest.response).to.be.undefined
                    expect(consumptionRequest.status).to.equal(ConsumptionRequestStatus.Open)
                    expect(consumptionRequest.statusLog).to.be.empty
                    expect(consumptionRequest.content.toJSON()).to.deep.equal(consumptionRequest.content.toJSON())
                })

                it("cannot create incoming Request from outgoing Message", async function () {
                    const requestSource = await TestObjectFactory.createOutgoingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(TestObjectFactory.createRequestWithOneItem())

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: request,
                            source: requestSource
                        }),
                        "Cannot create incoming Request from own Message"
                    )
                })

                it("creates an incoming Request with an incoming RelationshipTemplate as source", async function () {
                    const requestSource = await TestObjectFactory.createIncomingRelationshipTemplate()
                    const request = await Request.from(TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: request,
                            source: requestSource
                        })

                    expect(consumptionRequest).to.be.instanceOf(ConsumptionRequest)
                    expect(consumptionRequest.id).to.exist
                    expect(consumptionRequest.createdAt).to.exist
                    expect(consumptionRequest.isOwn).to.be.false
                    expect(consumptionRequest.peer).to.equal(requestSource.cache!.createdBy)
                    expect(consumptionRequest.sourceReference).to.equal(requestSource.id)
                    expect(consumptionRequest.sourceType).to.equal("Relationship")
                    expect(consumptionRequest.response).to.be.undefined
                    expect(consumptionRequest.status).to.equal(ConsumptionRequestStatus.Open)
                    expect(consumptionRequest.statusLog).to.be.empty
                    expect(consumptionRequest.content.toJSON()).to.deep.equal(consumptionRequest.content.toJSON())
                })

                it("cannot create incoming Request from outgoing RelationshipTemplate", async function () {
                    const requestSource = await TestObjectFactory.createOutgoingRelationshipTemplate(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(TestObjectFactory.createRequestWithOneItem())

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: request,
                            source: requestSource
                        }),
                        "Cannot create incoming Request from own Relationship Template"
                    )
                })
            })

            describe("Get", function () {
                it("returns a Request that was created before", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const consumptionRequest = await defaultAccount.consumptionController.requests.get(
                        createdConsumptionRequest.id
                    )

                    expect(consumptionRequest).to.exist
                })

                it("returns undefined when the given id does not exist", async function () {
                    const consumptionRequest = await defaultAccount.consumptionController.requests.get(
                        await CoreId.generate()
                    )

                    expect(consumptionRequest).to.be.undefined
                })
            })

            describe("Accept", function () {
                it("sets the response property of the Consumption Request", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const acceptedRequest = await defaultAccount.consumptionController.requests.accept({
                        requestId: consumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Accept
                            }
                        ]
                    })

                    expect(acceptedRequest.response).to.exist
                    expect(acceptedRequest.response).to.be.instanceOf(ConsumptionResponseDraft)
                })

                it("updates the status of the Consumption Request", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const acceptedRequest = await defaultAccount.consumptionController.requests.accept({
                        requestId: consumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Accept
                            }
                        ]
                    })

                    expect(acceptedRequest.status).to.equal(ConsumptionRequestStatus.Completed)
                    expect(acceptedRequest.statusLog).to.have.lengthOf(1)
                    expect(acceptedRequest.statusLog[0].oldStatus).to.equal(ConsumptionRequestStatus.Open)
                    expect(acceptedRequest.statusLog[0].newStatus).to.equal(ConsumptionRequestStatus.Completed)
                })

                it("persists the updated Consumption Request", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    await defaultAccount.consumptionController.requests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Accept
                            }
                        ]
                    })

                    const updatedConsumptionRequest = (await defaultAccount.consumptionController.requests.get(
                        createdConsumptionRequest.id
                    ))!

                    expect(updatedConsumptionRequest).to.exist
                    expect(updatedConsumptionRequest.response).to.exist
                    expect(updatedConsumptionRequest.response).to.be.instanceOf(ConsumptionResponseDraft)
                })

                it("creates Response Items and Groups with the correct structure", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from({
                                "@type": "Request",
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false
                                    },
                                    {
                                        "@type": "RequestItemGroup",
                                        mustBeAccepted: false,
                                        items: [
                                            {
                                                "@type": "TestRequestItem",
                                                mustBeAccepted: false
                                            }
                                        ]
                                    }
                                ]
                            }),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const acceptedRequest = await defaultAccount.consumptionController.requests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Accept
                            },
                            {
                                items: [
                                    {
                                        decision: RequestItemDecision.Reject
                                    }
                                ]
                            }
                        ]
                    })

                    const responseContent = acceptedRequest.response!.content

                    expect(responseContent.items).to.have.lengthOf(2)
                    expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                    expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                    expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                })

                it("creates Response Items with the correct result", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from({
                                "@type": "Request",
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        responseMetadata: {
                                            outerItemMetaKey: "outerItemMetaValue"
                                        }
                                    },
                                    {
                                        "@type": "RequestItemGroup",
                                        responseMetadata: {
                                            groupMetaKey: "groupMetaValue"
                                        },
                                        mustBeAccepted: false,
                                        items: [
                                            {
                                                "@type": "TestRequestItem",
                                                responseMetadata: {
                                                    innerItemMetaKey: "innerItemMetaValue"
                                                },
                                                mustBeAccepted: false
                                            }
                                        ]
                                    }
                                ]
                            }),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const acceptedRequest = await defaultAccount.consumptionController.requests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Accept
                            },
                            {
                                items: [
                                    {
                                        decision: RequestItemDecision.Reject
                                    }
                                ]
                            }
                        ]
                    })

                    const responseContent = acceptedRequest.response!.content

                    const outerResponseItem = responseContent.items[0] as ResponseItem
                    expect(outerResponseItem.result).to.equal(ResponseItemResult.Accepted)

                    const responseGroup = responseContent.items[1] as ResponseItemGroup
                    const innerResponseItem = responseGroup.items[0]
                    expect(innerResponseItem.result).to.equal(ResponseItemResult.Rejected)
                })

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from({
                                "@type": "Request",
                                items: [
                                    {
                                        "@type": "TestRequestItem",
                                        mustBeAccepted: false,
                                        responseMetadata: {
                                            outerItemMetaKey: "outerItemMetaValue"
                                        }
                                    },
                                    {
                                        "@type": "RequestItemGroup",
                                        responseMetadata: {
                                            groupMetaKey: "groupMetaValue"
                                        },
                                        mustBeAccepted: false,
                                        items: [
                                            {
                                                "@type": "TestRequestItem",
                                                responseMetadata: {
                                                    innerItemMetaKey: "innerItemMetaValue"
                                                },
                                                mustBeAccepted: false
                                            }
                                        ]
                                    }
                                ]
                            }),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const acceptedRequest = await defaultAccount.consumptionController.requests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Accept
                            },
                            {
                                items: [
                                    {
                                        decision: RequestItemDecision.Reject
                                    }
                                ]
                            }
                        ]
                    })

                    const responseContent = acceptedRequest.response!.content

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

            describe.skip("Reject", function () {
                it("sets the response property of the Consumption Request", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.requests.createIncomingRequest({
                            content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                            source: await TestObjectFactory.createIncomingRelationshipTemplate()
                        })

                    const rejectedRequest = await defaultAccount.consumptionController.requests.reject({
                        requestId: consumptionRequest.id,
                        items: [
                            {
                                decision: RequestItemDecision.Reject
                            }
                        ]
                    })

                    expect(rejectedRequest.response).to.exist
                    expect(rejectedRequest.response).to.be.instanceOf(ConsumptionResponseDraft)
                })

                // it("updates the status of the Consumption Request", async function () {
                //     const consumptionRequest =
                //         await defaultAccount.consumptionController.requests.createIncomingRequest({
                //             content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                //             source: await TestObjectFactory.createIncomingRelationshipTemplate()
                //         })

                //     const rejectedRequest = await defaultAccount.consumptionController.requests.reject({
                //         requestId: consumptionRequest.id,
                //         items: [
                //             {
                //                 decision: RequestItemDecision.Reject
                //             }
                //         ]
                //     })

                //     expect(rejectedRequest.status).to.equal(ConsumptionRequestStatus.Completed)
                //     expect(rejectedRequest.statusLog).to.have.lengthOf(1)
                //     expect(rejectedRequest.statusLog[0].oldStatus).to.equal(ConsumptionRequestStatus.Open)
                //     expect(rejectedRequest.statusLog[0].newStatus).to.equal(ConsumptionRequestStatus.Completed)
                // })

                // it("persists the updated Consumption Request", async function () {
                //     const createdConsumptionRequest =
                //         await defaultAccount.consumptionController.requests.createIncomingRequest({
                //             content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                //             source: await TestObjectFactory.createIncomingRelationshipTemplate()
                //         })

                //     await defaultAccount.consumptionController.requests.reject({
                //         requestId: createdConsumptionRequest.id,
                //         items: [
                //             {
                //                 decision: RequestItemDecision.Reject
                //             }
                //         ]
                //     })

                //     const updatedConsumptionRequest = await defaultAccount.consumptionController.requests.get(
                //         createdConsumptionRequest.id
                //     )

                //     expect(updatedConsumptionRequest).to.exist
                //     expect(updatedConsumptionRequest.response).to.exist
                // })

                // it("creates Response Items and Groups with the correct structure", async function () {
                //     const createdConsumptionRequest =
                //         await defaultAccount.consumptionController.requests.createIncomingRequest({
                //             content: await Request.from({
                //                 "@type": "Request",
                //                 items: [
                //                     {
                //                         "@type": "TestRequestItem",
                //                         mustBeAccepted: false
                //                     },
                //                     {
                //                         "@type": "RequestItemGroup",
                //                         mustBeAccepted: false,
                //                         items: [
                //                             {
                //                                 "@type": "TestRequestItem",
                //                                 mustBeAccepted: false
                //                             }
                //                         ]
                //                     }
                //                 ]
                //             }),
                //             source: await TestObjectFactory.createIncomingRelationshipTemplate()
                //         })

                //     const rejectedRequest = await defaultAccount.consumptionController.requests.reject({
                //         requestId: createdConsumptionRequest.id,
                //         items: [
                //             {
                //                 decision: RequestItemDecision.Reject
                //             },
                //             {
                //                 items: [
                //                     {
                //                         decision: RequestItemDecision.Reject
                //                     }
                //                 ]
                //             }
                //         ]
                //     })

                //     const responseContent = rejectedRequest.response!.content

                //     expect(responseContent.items).to.have.lengthOf(2)
                //     expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                //     expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                //     expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                // })

                // it("creates Response Items with the correct result", async function () {
                //     const createdConsumptionRequest =
                //         await defaultAccount.consumptionController.requests.createIncomingRequest({
                //             content: await Request.from({
                //                 "@type": "Request",
                //                 items: [
                //                     {
                //                         "@type": "TestRequestItem",
                //                         mustBeAccepted: false,
                //                         responseMetadata: {
                //                             outerItemMetaKey: "outerItemMetaValue"
                //                         }
                //                     },
                //                     {
                //                         "@type": "RequestItemGroup",
                //                         responseMetadata: {
                //                             groupMetaKey: "groupMetaValue"
                //                         },
                //                         mustBeAccepted: false,
                //                         items: [
                //                             {
                //                                 "@type": "TestRequestItem",
                //                                 responseMetadata: {
                //                                     innerItemMetaKey: "innerItemMetaValue"
                //                                 },
                //                                 mustBeAccepted: false
                //                             }
                //                         ]
                //                     }
                //                 ]
                //             }),
                //             source: await TestObjectFactory.createIncomingRelationshipTemplate()
                //         })

                //     const rejectedRequest = await defaultAccount.consumptionController.requests.reject({
                //         requestId: createdConsumptionRequest.id,
                //         items: [
                //             {
                //                 decision: RequestItemDecision.Reject
                //             },
                //             {
                //                 items: [
                //                     {
                //                         decision: RequestItemDecision.Reject
                //                     }
                //                 ]
                //             }
                //         ]
                //     })

                //     const responseContent = rejectedRequest.response!.content

                //     const outerResponseItem = responseContent.items[0] as ResponseItem
                //     expect(outerResponseItem.result).to.equal(ResponseItemResult.Rejected)

                //     const responseGroup = responseContent.items[1] as ResponseItemGroup
                //     const innerResponseItem = responseGroup.items[0]
                //     expect(innerResponseItem.result).to.equal(ResponseItemResult.Rejected)
                // })

                // it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                //     const createdConsumptionRequest =
                //         await defaultAccount.consumptionController.requests.createIncomingRequest({
                //             content: await Request.from({
                //                 "@type": "Request",
                //                 items: [
                //                     {
                //                         "@type": "TestRequestItem",
                //                         mustBeAccepted: false,
                //                         responseMetadata: {
                //                             outerItemMetaKey: "outerItemMetaValue"
                //                         }
                //                     },
                //                     {
                //                         "@type": "RequestItemGroup",
                //                         responseMetadata: {
                //                             groupMetaKey: "groupMetaValue"
                //                         },
                //                         mustBeAccepted: false,
                //                         items: [
                //                             {
                //                                 "@type": "TestRequestItem",
                //                                 responseMetadata: {
                //                                     innerItemMetaKey: "innerItemMetaValue"
                //                                 },
                //                                 mustBeAccepted: false
                //                             }
                //                         ]
                //                     }
                //                 ]
                //             }),
                //             source: await TestObjectFactory.createIncomingRelationshipTemplate()
                //         })

                //     const rejectedRequest = await defaultAccount.consumptionController.requests.reject({
                //         requestId: createdConsumptionRequest.id,
                //         items: [
                //             {
                //                 decision: RequestItemDecision.Reject
                //             },
                //             {
                //                 items: [
                //                     {
                //                         decision: RequestItemDecision.Reject
                //                     }
                //                 ]
                //             }
                //         ]
                //     })

                //     const responseContent = rejectedRequest.response!.content

                //     const outerResponseItem = responseContent.items[0] as ResponseItem
                //     expect(outerResponseItem.metadata).to.deep.equal({
                //         outerItemMetaKey: "outerItemMetaValue"
                //     })

                //     const responseGroup = responseContent.items[1] as ResponseItemGroup
                //     expect(responseGroup.metadata).to.deep.equal({
                //         groupMetaKey: "groupMetaValue"
                //     })

                //     const innerResponseItem = responseGroup.items[0]
                //     expect(innerResponseItem.metadata).to.deep.equal({
                //         innerItemMetaKey: "innerItemMetaValue"
                //     })
                // })
            })
        })
    }
}

interface Account {
    accountController: AccountController
    consumptionController: ConsumptionController
}
