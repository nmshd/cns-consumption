import {
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
    ConsumptionController,
    ConsumptionIds,
    LocalRequest,
    LocalRequestStatus,
    ReadAttributeRequestItemProcessor
} from "@nmshd/consumption"
import {
    AbstractStringJSON,
    IAbstractStringJSON,
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
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory"

export class ReadAttributeRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        const that = this

        describe("ReadAttributeRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.eventBus, that.loggerFactory)

            let consumptionController: ConsumptionController
            let accountController: AccountController

            let processor: ReadAttributeRequestItemProcessor

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 1)
                ;({ accountController, consumptionController } = accounts[0])
            })

            this.beforeEach(function () {
                processor = new ReadAttributeRequestItemProcessor(consumptionController)
            })

            describe("canCreateOutgoingRequestItem", function () {
                describe("IdentityAttributeQuery", function () {
                    it("simple query", function () {
                        const query = IdentityAttributeQuery.from({
                            "@type": "IdentityAttributeQuery",
                            valueType: "GivenName"
                        })

                        const requestItem = ReadAttributeRequestItem.from({
                            mustBeAccepted: false,
                            query: query
                        })

                        const result = processor.canCreateOutgoingRequestItem(
                            requestItem,
                            Request.from({ items: [requestItem] }),
                            CoreAddress.from("recipientAddress")
                        )

                        expect(result).to.be.a.successfulValidationResult()
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
                                errorMessage: "Cannot query own Attributes from a third party."
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
                    itParam("${value.description}", testParams, function (testParams: TestParams) {
                        function translateTestIdentityToAddress(testIdentity?: TestIdentity) {
                            if (testIdentity === undefined) return undefined

                            switch (testIdentity) {
                                case TestIdentity.Self:
                                    return accountController.identity.address.toString()
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

                        const result = processor.canCreateOutgoingRequestItem(
                            requestItem,
                            Request.from({ items: [requestItem] }),
                            CoreAddress.from("recipientAddress")
                        )

                        if (testParams.expectedOutput.hasOwnProperty("success")) {
                            expect(result).to.be.a.successfulValidationResult()
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
                it("can be called with the id of an existing own LocalAttribute", async function () {
                    const attribute = await consumptionController.attributes.createLocalAttribute({
                        content: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from(accountController.identity.address)
                        })
                    })

                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                        accept: true,
                        existingAttributeId: attribute.id.toString()
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result).to.be.a.successfulValidationResult()
                })

                it("can be called with a new Attribute", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                        accept: true,
                        newAttribute: {
                            "@type": "IdentityAttribute",
                            owner: accountController.identity.address.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            } as AbstractStringJSON
                        } as IdentityAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result).to.be.a.successfulValidationResult()
                })

                it("returns an error when the given Attribute id does not exist", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                        accept: true,
                        existingAttributeId: "non-existent-id"
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.transport.recordNotFound"
                    })
                })

                it("returns an error when the given Attribute id belongs to a peer Attribute", async function () {
                    const peer = CoreAddress.from("id1")

                    const peerAttributeId = await ConsumptionIds.attribute.generate()

                    await consumptionController.attributes.createPeerLocalAttribute({
                        id: peerAttributeId,
                        content: TestObjectFactory.createIdentityAttribute({
                            owner: peer
                        }),
                        peer: peer,
                        requestReference: await ConsumptionIds.request.generate()
                    })

                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const request = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: peer,
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                        accept: true,
                        existingAttributeId: peerAttributeId.toString()
                    }

                    const result = await processor.canAccept(requestItem, acceptParams, request)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: /The given Attribute belongs to someone else. You can only share own Attributes./
                    })
                })
            })

            describe("accept", function () {
                it("in case of a given attributeId of an own Local Attribute, creates a copy of the Local Attribute with the given id with share info for the peer of the Request", async function () {
                    const attribute = await consumptionController.attributes.createLocalAttribute({
                        content: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from(accountController.identity.address)
                        })
                    })

                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const incomingRequest = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON = {
                        accept: true,
                        existingAttributeId: attribute.id.toString()
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)

                    const createdAttribute = await consumptionController.attributes.getLocalAttribute(
                        result.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                })

                it("in case of a given own IdentityAttribute, creates a new Repository Attribute as well as a copy of it for the peer", async function () {
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const incomingRequest = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: CoreAddress.from("id1"),
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                        accept: true,
                        newAttribute: {
                            "@type": "IdentityAttribute",
                            owner: accountController.identity.address.toString(),
                            value: {
                                "@type": "GivenName",
                                value: "AGivenName"
                            } as AbstractStringJSON
                        } as IdentityAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute(
                        result.attributeId
                    )

                    expect(createdSharedAttribute).to.exist
                    expect(createdSharedAttribute!.shareInfo).to.exist
                    expect(createdSharedAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdSharedAttribute!.shareInfo!.sourceAttribute).to.exist

                    const createdRepositoryAttribute = await consumptionController.attributes.getLocalAttribute(
                        createdSharedAttribute!.shareInfo!.sourceAttribute!
                    )
                    expect(createdRepositoryAttribute).to.exist
                })

                it("in case of a given peer RelationshipAttribute, creates a new Local Attribute with share info for the peer of the Request - but no Repository Attribute", async function () {
                    const senderAddress = accountController.identity.address
                    const requestItem = ReadAttributeRequestItem.from({
                        mustBeAccepted: true,
                        query: RelationshipAttributeQuery.from({
                            key: "aKey",
                            owner: senderAddress,
                            valueType: "ProprietaryString",
                            attributeCreationHints: {
                                title: "ATitle",
                                confidentiality: RelationshipAttributeConfidentiality.Public
                            }
                        })
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const incomingRequest = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: senderAddress,
                        status: LocalRequestStatus.DecisionRequired,
                        content: Request.from({
                            id: requestId,
                            items: [requestItem]
                        }),
                        statusLog: []
                    })

                    const acceptParams: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON = {
                        accept: true,
                        newAttribute: {
                            "@type": "RelationshipAttribute",
                            key: "AKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            owner: senderAddress.toString(),
                            value: {
                                "@type": "ProprietaryString",
                                value: "AStringValue"
                            } as AbstractStringJSON
                        } as RelationshipAttributeJSON<IAbstractStringJSON>
                    }

                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdSharedAttribute = await consumptionController.attributes.getLocalAttribute(
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

                    const incomingRequest = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: peer,
                        status: LocalRequestStatus.DecisionRequired,
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
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: peer
                        })
                    })

                    await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest)

                    const createdAttribute = await consumptionController.attributes.getLocalAttribute(attributeId)
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })
            })
        })
    }
}
