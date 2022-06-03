import {
    AcceptCreateAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    CreateAttributeRequestItemProcessor,
    ErrorValidationResult
} from "@nmshd/consumption"
import {
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    GivenName,
    IdentityAttribute,
    ProprietaryString,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality,
    Request,
    ResponseItemResult
} from "@nmshd/content"
import { AccountController, CoreAddress, CoreDate, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../../../core/IntegrationTest"
import { TestUtil } from "../../../../core/TestUtil"

export class CreateAttributeRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        const that = this

        describe("CreateAttributeRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)

            let consumptionController: ConsumptionController
            let testAccount: AccountController

            let processor: CreateAttributeRequestItemProcessor

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ accountController: testAccount, consumptionController } = account)
            })

            this.beforeEach(function () {
                processor = new CreateAttributeRequestItemProcessor(consumptionController)
            })

            describe("canCreateOutgoingRequestItem", function () {
                it("returns success when passing a Relationship Attribute", async function () {
                    const attribute = await consumptionController.attributes.createConsumptionAttribute({
                        content: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: testAccount.identity.address
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: attribute.content
                    })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem)

                    expect(result.isSuccess()).to.be.true
                })

                it("returns an error when passing an Identity Attribute", async function () {
                    const attribute = await consumptionController.attributes.createConsumptionAttribute({
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: testAccount.identity.address
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: attribute.content
                    })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem)

                    expect(result.isError()).to.be.true
                    expect((result as ErrorValidationResult).error.code).to.equal(
                        "error.consumption.requests.cannotSendCreateAttributeRequestItemsWithIdentityAttributes"
                    )
                })
            })

            describe("accept", function () {
                // TODO: remove the following if we for sure only allow RelationshipAttributes in a RequestItem
                // it("in case of an IdentityAttribute, creates a Repository Attribute as well as a copy of it for the peer of the Request", async function () {
                //     const attribute = await consumptionController.attributes.createConsumptionAttribute({
                //         content: IdentityAttribute.from({
                //             value: GivenName.fromAny({ value: "AGivenName" }),
                //             owner: CoreAddress.from(testAccount.identity.address)
                //         })
                //     })
                //     const requestItem = CreateAttributeRequestItem.from({
                //         mustBeAccepted: true,
                //         query: IdentityAttributeQuery.from({ valueType: "GivenName" })
                //     })
                //     const requestId = await ConsumptionIds.request.generate()
                //     const incomingRequest = ConsumptionRequest.from({
                //         id: requestId,
                //         createdAt: CoreDate.utc(),
                //         isOwn: false,
                //         peer: CoreAddress.from("id1"),
                //         status: ConsumptionRequestStatus.DecisionRequired,
                //         content: Request.from({
                //             id: requestId,
                //             items: [requestItem]
                //         }),
                //         statusLog: []
                //     })
                //     const acceptParams: AcceptReadAttributeRequestItemParametersJSON = {
                //         accept: true,
                //         attributeId: attribute.id.toString()
                //     }
                //     const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                //     const createdAttribute = await consumptionController.attributes.getConsumptionAttribute(
                //         result.attributeId
                //     )
                //     expect(createdAttribute).to.exist
                //     expect(createdAttribute!.shareInfo).to.exist
                //     expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                // })

                it("in case of a RelationshipAttribute, creates a ConsumptionAttribute for the peer of the Request", async function () {
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: true,
                        attribute: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: testAccount.identity.address
                        })
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
                    const acceptParams: AcceptCreateAttributeRequestItemParametersJSON = {
                        accept: true
                    }
                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        result.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })
            })

            describe("applyIncomingResponseItem", function () {
                it("creates a ConsumptionAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the request ", async function () {
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: true,
                        attribute: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: testAccount.identity.address
                        })
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

                    const responseItem = CreateAttributeAcceptResponseItem.from({
                        result: ResponseItemResult.Accepted,
                        attributeId: await ConsumptionIds.attribute.generate()
                    })
                    await processor.applyIncomingResponseItem(responseItem, requestItem, incomingRequest)
                    const createdAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        responseItem.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.content.toJSON()).to.deep.equal(requestItem.attribute.toJSON())
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })
            })
        })
    }
}
