import { IDatabaseCollection, IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { Result } from "@js-soft/ts-utils"
import {
    AcceptRequestItemParameters,
    ConsumptionController,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    ConsumptionResponse,
    CreateIncomingRequestParameters,
    DecideRequestItemGroupParameters,
    DecideRequestParamsValidator,
    ICreateOutgoingRequestParameters,
    IDecideRequestParameters,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { Request, ResponseItem, ResponseItemGroup, ResponseItemResult, ResponseResult } from "@nmshd/content"
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

export class IncomingRequestControllerTests extends IntegrationTest {
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
        let requestsCollection: IDatabaseCollection

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

                requestsCollection = (consumptionController.outgoingRequests as any)
                    .consumptionRequests as IDatabaseCollection
            })

            describe("CreateIncomingRequest", function () {
                it("creates an incoming Request with an incoming Message as source", async function () {
                    const requestSource = await TestObjectFactory.createIncomingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    expect(consumptionRequest).to.be.instanceOf(ConsumptionRequest)
                    expect(consumptionRequest.id).to.exist
                    expect(consumptionRequest.isOwn).to.be.false
                    expect(consumptionRequest.peer).to.equal(requestSource.cache!.createdBy)
                    expect(consumptionRequest.source).to.exist
                    expect(consumptionRequest.source!.reference.toString()).to.equal(requestSource.id.toString())
                    expect(consumptionRequest.source!.type).to.equal("Message")
                    expect(consumptionRequest.response).to.be.undefined
                    expect(consumptionRequest.status).to.equal(ConsumptionRequestStatus.Open)
                    expect(consumptionRequest.statusLog).to.be.empty
                }).timeout(5000)

                it("cannot create incoming Request from outgoing Message", async function () {
                    const requestSource = await TestObjectFactory.createOutgoingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        ),
                        "Cannot create incoming Request from own Message"
                    )
                }).timeout(5000)

                it("creates an incoming Request with an incoming RelationshipTemplate as source", async function () {
                    const requestSource = await TestObjectFactory.createIncomingRelationshipTemplate()
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    expect(consumptionRequest).to.be.instanceOf(ConsumptionRequest)
                    expect(consumptionRequest.id).to.exist
                    expect(consumptionRequest.createdAt).to.exist
                    expect(consumptionRequest.isOwn).to.be.false
                    expect(consumptionRequest.peer).to.equal(requestSource.cache!.createdBy)
                    expect(consumptionRequest.source).to.exist
                    expect(consumptionRequest.source!.reference).to.equal(requestSource.id)
                    expect(consumptionRequest.source!.type).to.equal("Relationship")
                    expect(consumptionRequest.response).to.be.undefined
                    expect(consumptionRequest.status).to.equal(ConsumptionRequestStatus.Open)
                    expect(consumptionRequest.statusLog).to.be.empty
                    expect(consumptionRequest.content.toJSON()).to.deep.equal(consumptionRequest.content.toJSON())
                }).timeout(5000)

                it("persists the created ConsumptionRequest", async function () {
                    const requestSource = await TestObjectFactory.createIncomingRelationshipTemplate()
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    const requestFromDb = await requestsCollection.read(consumptionRequest.id.toString())
                    expect(requestFromDb).to.exist
                })

                it("cannot create incoming Request from outgoing RelationshipTemplate", async function () {
                    const requestSource = await TestObjectFactory.createOutgoingRelationshipTemplate(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        ),
                        "Cannot create incoming Request from own Relationship Template"
                    )
                }).timeout(5000)

                it("throws on syntactically invalid input", async function () {
                    const paramsWithoutSource = {
                        content: await Request.from(await TestObjectFactory.createRequestWithOneItem())
                    }

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            paramsWithoutSource as any
                        ),
                        "*source*Value is not defined*"
                    )
                }).timeout(5000)

                it("created Consumption Request has ID of Request if one exists", async function () {
                    const requestSource = await TestObjectFactory.createIncomingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())
                    request.id = await CoreId.generate()

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    expect(consumptionRequest.id.toString()).equals(request.id.toString())
                }).timeout(5000)
            })

            describe("IncomingRequestAnswered", function () {
                it("updates the status of the ConsumptionRequest", async function () {
                    const requestSource = await TestObjectFactory.createIncomingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: consumptionRequest.id,
                        items: [AcceptRequestItemParameters.from({})]
                    })

                    const answeredRequest =
                        await defaultAccount.consumptionController.incomingRequests.incomingRequestAnswered(
                            consumptionRequest.id
                        )

                    expect(answeredRequest.status).to.equal(ConsumptionRequestStatus.Answered)

                    const statusLogEntry = answeredRequest.statusLog[answeredRequest.statusLog.length - 1]
                    expect(statusLogEntry.newStatus).to.equal(ConsumptionRequestStatus.Answered)
                })

                it("persists the updated ConsumptionRequest", async function () {
                    const requestSource = await TestObjectFactory.createIncomingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: consumptionRequest.id,
                        items: [AcceptRequestItemParameters.from({})]
                    })

                    await defaultAccount.consumptionController.incomingRequests.incomingRequestAnswered(
                        consumptionRequest.id
                    )

                    const answeredRequest = (await defaultAccount.consumptionController.outgoingRequests.get(
                        consumptionRequest.id
                    ))!

                    expect(answeredRequest.status).to.equal(ConsumptionRequestStatus.Answered)
                })

                it("cannot answer outgoing ConsumptionRequests", async function () {
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

                    const outgoingRequest =
                        await defaultAccount.consumptionController.outgoingRequests.createOutgoingRequest(params)

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.incomingRequestAnswered(
                            outgoingRequest.id
                        ),
                        "*Cannot decide own Request*"
                    )
                })

                it("can only answer ConsumptionRequests in status 'Decided'", async function () {
                    const requestSource = await TestObjectFactory.createIncomingMessage(
                        defaultAccount.accountController.identity.address
                    )
                    const request = await Request.from(await TestObjectFactory.createRequestWithOneItem())

                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: request,
                                source: requestSource
                            })
                        )

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.incomingRequestAnswered(
                            consumptionRequest.id
                        ),
                        "*Can only decide Request in status 'Decided'*"
                    )
                })
            })

            describe("Accept", function () {
                it("sets the response property of the Consumption Request to a ConsumptionResponse", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    const acceptedRequest = await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: consumptionRequest.id,
                        items: [AcceptRequestItemParameters.from({})]
                    })

                    expect(acceptedRequest.response).to.exist
                    expect(acceptedRequest.response).to.be.instanceOf(ConsumptionResponse)
                    expect(acceptedRequest.response!.content.requestId.toString()).to.equal(
                        consumptionRequest.id.toString()
                    )
                }).timeout(5000)

                it("updates the status of the Consumption Request", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    const acceptedRequest = await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: consumptionRequest.id,
                        items: [AcceptRequestItemParameters.from({})]
                    })

                    expect(acceptedRequest.status).to.equal(ConsumptionRequestStatus.Decided)
                    expect(acceptedRequest.statusLog).to.have.lengthOf(1)
                    expect(acceptedRequest.statusLog[0].oldStatus).to.equal(ConsumptionRequestStatus.Open)
                    expect(acceptedRequest.statusLog[0].newStatus).to.equal(ConsumptionRequestStatus.Decided)
                }).timeout(5000)

                it("persists the updated Consumption Request", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [AcceptRequestItemParameters.from({})]
                    })

                    const updatedConsumptionRequest = await defaultAccount.consumptionController.outgoingRequests.get(
                        createdConsumptionRequest.id
                    )

                    expect(updatedConsumptionRequest).to.exist
                    expect(updatedConsumptionRequest!.response).to.exist
                    expect(updatedConsumptionRequest!.response).to.be.instanceOf(ConsumptionResponse)
                    expect(updatedConsumptionRequest!.response!.content.result).to.equal(ResponseResult.Accepted)
                }).timeout(5000)

                it("creates Response Items and Groups with the correct structure", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
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
                        )

                    const acceptedRequest = await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            AcceptRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })

                    const responseContent = acceptedRequest.response!.content

                    expect(responseContent.items).to.have.lengthOf(2)
                    expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                    expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                    expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                }).timeout(5000)

                it("creates Response Items with the correct result", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
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
                        )

                    const acceptedRequest = await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            AcceptRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })

                    const responseContent = acceptedRequest.response!.content

                    const outerResponseItem = responseContent.items[0] as ResponseItem
                    expect(outerResponseItem.result).to.equal(ResponseItemResult.Accepted)

                    const responseGroup = responseContent.items[1] as ResponseItemGroup
                    const innerResponseItem = responseGroup.items[0]
                    expect(innerResponseItem.result).to.equal(ResponseItemResult.Rejected)
                }).timeout(5000)

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
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
                        )

                    const acceptedRequest = await defaultAccount.consumptionController.incomingRequests.accept({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            AcceptRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
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
                }).timeout(5000)

                it("throws on syntactically invalid input", async function () {
                    const paramsWithoutItems = {
                        requestId: CoreId.from("CNSREQ1")
                    }

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.accept(paramsWithoutItems as any),
                        "*items*Value is not defined*"
                    )
                }).timeout(5000)
            })

            describe("Reject", function () {
                it("sets the response property of the Consumption Request", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    const rejectedRequest = await defaultAccount.consumptionController.incomingRequests.reject({
                        requestId: consumptionRequest.id,
                        items: [RejectRequestItemParameters.from({})]
                    })

                    expect(rejectedRequest.response).to.exist
                    expect(rejectedRequest.response).to.be.instanceOf(ConsumptionResponse)
                    expect(rejectedRequest.response!.content.requestId.toString()).to.equal(
                        consumptionRequest.id.toString()
                    )
                }).timeout(5000)

                it("updates the status of the Consumption Request", async function () {
                    const consumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    const rejectedRequest = await defaultAccount.consumptionController.incomingRequests.reject({
                        requestId: consumptionRequest.id,
                        items: [RejectRequestItemParameters.from({})]
                    })

                    expect(rejectedRequest.status).to.equal(ConsumptionRequestStatus.Decided)
                    expect(rejectedRequest.statusLog).to.have.lengthOf(1)
                    expect(rejectedRequest.statusLog[0].oldStatus).to.equal(ConsumptionRequestStatus.Open)
                    expect(rejectedRequest.statusLog[0].newStatus).to.equal(ConsumptionRequestStatus.Decided)
                }).timeout(5000)

                it("persists the updated Consumption Request", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
                                content: await Request.from(await TestObjectFactory.createRequestWithOneItem()),
                                source: await TestObjectFactory.createIncomingRelationshipTemplate()
                            })
                        )

                    await defaultAccount.consumptionController.incomingRequests.reject({
                        requestId: createdConsumptionRequest.id,
                        items: [RejectRequestItemParameters.from({})]
                    })

                    const updatedConsumptionRequest = await defaultAccount.consumptionController.outgoingRequests.get(
                        createdConsumptionRequest.id
                    )

                    expect(updatedConsumptionRequest).to.exist
                    expect(updatedConsumptionRequest!.response).to.exist
                    expect(updatedConsumptionRequest!.response).to.be.instanceOf(ConsumptionResponse)
                    expect(updatedConsumptionRequest!.response!.content.result).to.equal(ResponseResult.Rejected)
                }).timeout(5000)

                it("creates Response Items and Groups with the correct structure", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
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
                        )

                    const rejectedRequest = await defaultAccount.consumptionController.incomingRequests.reject({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            RejectRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })

                    const responseContent = rejectedRequest.response!.content

                    expect(responseContent.items).to.have.lengthOf(2)
                    expect(responseContent.items[0]).to.be.instanceOf(ResponseItem)
                    expect(responseContent.items[1]).to.be.instanceOf(ResponseItemGroup)
                    expect((responseContent.items[1] as ResponseItemGroup).items[0]).to.be.instanceOf(ResponseItem)
                }).timeout(5000)

                it("creates Response Items with the correct result", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
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
                        )

                    const rejectedRequest = await defaultAccount.consumptionController.incomingRequests.reject({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            RejectRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })

                    const responseContent = rejectedRequest.response!.content

                    const outerResponseItem = responseContent.items[0] as ResponseItem
                    expect(outerResponseItem.result).to.equal(ResponseItemResult.Rejected)

                    const responseGroup = responseContent.items[1] as ResponseItemGroup
                    const innerResponseItem = responseGroup.items[0]
                    expect(innerResponseItem.result).to.equal(ResponseItemResult.Rejected)
                }).timeout(5000)

                it("writes responseMetadata from Request Items and Groups into the corresponding Response Items and Groups", async function () {
                    const createdConsumptionRequest =
                        await defaultAccount.consumptionController.incomingRequests.createIncomingRequest(
                            CreateIncomingRequestParameters.from({
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
                        )

                    const rejectedRequest = await defaultAccount.consumptionController.incomingRequests.reject({
                        requestId: createdConsumptionRequest.id,
                        items: [
                            RejectRequestItemParameters.from({}),
                            DecideRequestItemGroupParameters.from({
                                items: [RejectRequestItemParameters.from({})]
                            })
                        ]
                    })

                    const responseContent = rejectedRequest.response!.content

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
                }).timeout(5000)

                it("throws on syntactically invalid input", async function () {
                    const paramsWithoutItems = {
                        requestId: CoreId.from("CNSREQ1")
                    }

                    await TestUtil.expectThrowsAsync(
                        defaultAccount.consumptionController.incomingRequests.reject(paramsWithoutItems as any),
                        "*items*Value is not defined*"
                    )
                }).timeout(5000)
            })
        })
    }
}

interface Account {
    accountController: AccountController
    consumptionController: ConsumptionController
}
