import {
    AcceptReadAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    ErrorValidationResult,
    ReadAttributeRequestItemProcessor
} from "@nmshd/consumption"
import {
    AbstractStringJSON,
    GivenName,
    IAbstractStringJSON,
    IdentityAttribute,
    IdentityAttributeJSON,
    IdentityAttributeQuery,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RelationshipAttributeConfidentiality,
    RelationshipAttributeJSON,
    Request,
    ResponseItemResult
} from "@nmshd/content"
import { AccountController, CoreAddress, CoreDate, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../../../core/IntegrationTest"
import { TestUtil } from "../../../../core/TestUtil"

export class ReadAttributeRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        const that = this

        describe("ReadAttributeRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)

            let consumptionController: ConsumptionController
            let testAccount: AccountController

            let processor: ReadAttributeRequestItemProcessor

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ accountController: testAccount, consumptionController } = account)
            })

            this.beforeEach(function () {
                processor = new ReadAttributeRequestItemProcessor(consumptionController)
            })

            describe("canAccept", function () {
                it("can be called with the id of an existing ConsumptionAttribute", async function () {
                    const attribute = await consumptionController.attributes.createConsumptionAttribute({
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: CoreAddress.from(testAccount.identity.address)
                        })
                    })

                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attributeId: attribute.id.toString()
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result.isSuccess()).to.be.true
                })

                it("can be called with a new Attribute", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attribute: {
                            "@type": "IdentityAttribute",
                            owner: testAccount.identity.address.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            } as AbstractStringJSON
                        } as IdentityAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result.isSuccess()).to.be.true
                })

                it("returns an error when the given Attribute id does not exist", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attributeId: "non-existent-id"
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result.isError()).to.be.true
                    expect((result as ErrorValidationResult).error.code).to.equal("error.transport.recordNotFound")
                })

                it("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
                    const peer = CoreAddress.from("id1")

                    const peerAttributeId = await ConsumptionIds.attribute.generate()

                    await consumptionController.attributes.createPeerConsumptionAttribute({
                        id: peerAttributeId,
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: CoreAddress.from(peer)
                        }),
                        peer: peer,
                        requestReference: await ConsumptionIds.request.generate()
                    })

                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: peer,
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attributeId: peerAttributeId.toString()
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result.isError()).to.be.true
                    expect((result as ErrorValidationResult).error.code).to.equal(
                        "error.consumption.requests.canOnlyShareOwnAttributes"
                    )
                })
            })

            describe("accept", function () {
                it("in case of a given attributeId, creates a copy of the Consumption Attribute with the given id with share info for the peer of the Request", async function () {
                    const attribute = await consumptionController.attributes.createConsumptionAttribute({
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: CoreAddress.from(testAccount.identity.address)
                        })
                    })

                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const incomingRequest = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attributeId: attribute.id.toString()
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)

                    const createdAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        result.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                })

                it("in case of a given IdentityAttribute, creates a new Repository Attribute as well as a copy of it for the peer", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const incomingRequest = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attribute: {
                            "@type": "IdentityAttribute",
                            owner: testAccount.identity.address.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            } as AbstractStringJSON
                        } as IdentityAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdSharedAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        result.attributeId
                    )

                    expect(createdSharedAttribute).to.exist
                    expect(createdSharedAttribute!.shareInfo).to.exist
                    expect(createdSharedAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdSharedAttribute!.shareInfo!.sourceAttribute).to.exist

                    const createdRepositoryAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        createdSharedAttribute!.shareInfo!.sourceAttribute!
                    )
                    expect(createdRepositoryAttribute).to.exist
                })

                it("in case of a given RelationshipAttribute, creates a new Consumption Attribute with share info for the peer of the Request - but no Repository Attribute", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const incomingRequest = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                        accept: true,
                        attribute: {
                            "@type": "RelationshipAttribute",
                            key: "AKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            owner: testAccount.identity.address.toString(),
                            value: {
                                "@type": "ProprietaryString",
                                value: "AStringValue"
                            } as AbstractStringJSON
                        } as RelationshipAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdSharedAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        result.attributeId
                    )

                    expect(createdSharedAttribute).to.exist
                    expect(createdSharedAttribute!.shareInfo).to.exist
                    expect(createdSharedAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdSharedAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })
            })

            describe("applyIncomingResponseItem", function () {
                it("creates a peer Attribute with the Attribute received in the ResponseItem", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const peer = CoreAddress.from("id1")

                    const incomingRequest = ConsumptionRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: peer,
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })
                    const attributeId = await ConsumptionIds.attribute.generate()

                    const responseItem = ReadAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: attributeId,
                        attribute: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: peer
                        })
                    })

                    await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest)
                    const createdAttribute = await consumptionController.attributes.getConsumptionAttribute(attributeId)
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                })
            })
        })
    }
}
