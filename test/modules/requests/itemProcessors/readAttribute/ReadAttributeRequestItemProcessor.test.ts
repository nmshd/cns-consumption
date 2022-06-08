import {
    AcceptReadAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
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
    RelationshipAttributeQuery,
    Request,
    ResponseItemResult
} from "@nmshd/content"
import { AccountController, CoreAddress, CoreDate, Transport } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import { IntegrationTest } from "../../../../core/IntegrationTest"
import { TestUtil } from "../../../../core/TestUtil"

export class ReadAttributeRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        const that = this

        describe("ReadAttributeRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)

            let senderConsumptionController: ConsumptionController
            let senderAccountController: AccountController

            let processor: ReadAttributeRequestItemProcessor

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 2)
                ;({ accountController: senderAccountController, consumptionController: senderConsumptionController } =
                    accounts[0])
            })

            this.beforeEach(function () {
                processor = new ReadAttributeRequestItemProcessor(senderConsumptionController)
            })

            describe("canCreateOutgoingRequestItem", function () {
                describe("IdentityAttributeQuery", function () {
                    it("simple query", async function () {
                        const query = IdentityAttributeQuery.from({
                            "@type": "IdentityAttributeQuery",
                            valueType: "GivenName"
                        })

                        const requestItem = ReadAttributeRequestItem.from({
                            mustBeAccepted: false,
                            query: query
                        })

                        const result = await processor.canCreateOutgoingRequestItem(
                            requestItem,
                            Request.from({ items: [requestItem] }),
                            CoreAddress.from("recipientAddress")
                        )

                        expect(result).to.be.a.successfulValidationResult
                    })
                })

                describe("RelationshipAttributeQuery", function () {
                    enum TestIdentity {
                        Self,
                        Recipient,
                        OtherWithRelationship,
                        OtherWithoutRelationship,
                        ThirdParty
                    }

                    interface TestParams {
                        description: string
                        input: {
                            owner: TestIdentity
                            thirdParty?: TestIdentity
                        }
                        expectedOutput:
                            | {
                                  success: true
                              }
                            | { errorMessage?: string; errorCode?: string }
                    }

                    const testParams: TestParams[] = [
                        {
                            description: "query with owner=self, used for e.g. electric meter number",
                            input: {
                                owner: TestIdentity.Self
                            },
                            expectedOutput: {
                                success: true
                            }
                        },
                        {
                            description:
                                "query with owner=thirdParty=someThirdParty, used for e.g. the bonuscard-number of a different company",
                            input: {
                                owner: TestIdentity.ThirdParty,
                                thirdParty: TestIdentity.ThirdParty
                            },
                            expectedOutput: {
                                success: true
                            }
                        },
                        {
                            description: "cannot query own attributes from third party",
                            input: {
                                owner: TestIdentity.Self,
                                thirdParty: TestIdentity.ThirdParty
                            },
                            expectedOutput: {
                                errorCode: "error.consumption.requests.invalidRequestItem",
                                errorMessage: "Cannot query query own Attributes from a third party."
                            }
                        },
                        {
                            description: "cannot query with thirdParty = self",
                            input: {
                                owner: TestIdentity.Self,
                                thirdParty: TestIdentity.Self
                            },
                            expectedOutput: {
                                errorCode: "error.consumption.requests.invalidRequestItem",
                                errorMessage: "Cannot query an Attribute with the own address as third party."
                            }
                        },
                        {
                            description: "cannot query with thirdParty = recipient",
                            input: {
                                owner: TestIdentity.Recipient,
                                thirdParty: TestIdentity.Recipient
                            },
                            expectedOutput: {
                                errorCode: "error.consumption.requests.invalidRequestItem",
                                errorMessage: "Cannot query an Attribute with the recipient's address as third party."
                            }
                        }
                    ]
                    itParam("${value.description}", testParams, async function (testParams: TestParams) {
                        function translateTestIdentityToAddress(testIdentity?: TestIdentity) {
                            if (testIdentity === undefined) return undefined

                            switch (testIdentity) {
                                case TestIdentity.Self:
                                    return senderAccountController.identity.address.toString()
                                case TestIdentity.Recipient:
                                    return CoreAddress.from("recipientAddress").toString()
                                case TestIdentity.OtherWithRelationship:
                                    return CoreAddress.from("recipientAddress").toString()
                                case TestIdentity.OtherWithoutRelationship:
                                    return "someAddressWithoutRelationship"
                                case TestIdentity.ThirdParty:
                                    return "someThirdPartyAddress"
                                default:
                                    throw new Error("Given TestIdentity does not exist")
                            }
                        }

                        const query = RelationshipAttributeQuery.from({
                            "@type": "RelationshipAttributeQuery",
                            owner: translateTestIdentityToAddress(testParams.input.owner)!,
                            thirdParty: translateTestIdentityToAddress(testParams.input.thirdParty),
                            key: "aKey",
                            valueType: "AValueType",
                            attributeCreationHints: {
                                title: "ATitle",
                                confidentiality: RelationshipAttributeConfidentiality.Public,
                                isTechnical: false
                            }
                        })

                        const requestItem = ReadAttributeRequestItem.from({
                            mustBeAccepted: false,
                            query: query
                        })

                        const result = await processor.canCreateOutgoingRequestItem(
                            requestItem,
                            Request.from({ items: [requestItem] }),
                            CoreAddress.from("recipientAddress")
                        )

                        if (testParams.expectedOutput.hasOwnProperty("success")) {
                            expect(result).to.be.a.successfulValidationResult
                        } else {
                            const error = testParams.expectedOutput as { errorCode?: string; errorMessage?: string }
                            expect(result).to.be.an.errorValidationResult({
                                code: error.errorCode,
                                message: error.errorMessage
                            })
                        }
                    })
                })
            })

            describe("canAccept", function () {
                it("can be called with the id of an existing ConsumptionAttribute", async function () {
                    const attribute = await senderConsumptionController.attributes.createConsumptionAttribute({
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: CoreAddress.from(senderAccountController.identity.address)
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

                    expect(result).to.be.a.successfulValidationResult
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
                            owner: senderAccountController.identity.address.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            } as AbstractStringJSON
                        } as IdentityAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result).to.be.a.successfulValidationResult
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

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.transport.recordNotFound"
                    })
                })

                it("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
                    const peer = CoreAddress.from("id1")

                    const peerAttributeId = await ConsumptionIds.attribute.generate()

                    await senderConsumptionController.attributes.createPeerConsumptionAttribute({
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

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: /The given Attribute belongs to someone else. You can only share own Attributes./
                    })
                })
            })

            describe("accept", function () {
                it("in case of a given attributeId, creates a copy of the Consumption Attribute with the given id with share info for the peer of the Request", async function () {
                    const attribute = await senderConsumptionController.attributes.createConsumptionAttribute({
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: CoreAddress.from(senderAccountController.identity.address)
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

                    const createdAttribute = await senderConsumptionController.attributes.getConsumptionAttribute(
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
                            owner: senderAccountController.identity.address.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            } as AbstractStringJSON
                        } as IdentityAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdSharedAttribute = await senderConsumptionController.attributes.getConsumptionAttribute(
                        result.attributeId
                    )

                    expect(createdSharedAttribute).to.exist
                    expect(createdSharedAttribute!.shareInfo).to.exist
                    expect(createdSharedAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdSharedAttribute!.shareInfo!.sourceAttribute).to.exist

                    const createdRepositoryAttribute =
                        await senderConsumptionController.attributes.getConsumptionAttribute(
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
                            owner: senderAccountController.identity.address.toString(),
                            value: {
                                "@type": "ProprietaryString",
                                value: "AStringValue"
                            } as AbstractStringJSON
                        } as RelationshipAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdSharedAttribute = await senderConsumptionController.attributes.getConsumptionAttribute(
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
                    const createdAttribute = await senderConsumptionController.attributes.getConsumptionAttribute(
                        attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                })
            })
        })
    }
}
