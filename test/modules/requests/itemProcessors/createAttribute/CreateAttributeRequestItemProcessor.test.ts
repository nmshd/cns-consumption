import {
    AcceptCreateAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    CreateAttributeRequestItemProcessor
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
                it("returns success when passing a Relationship Attribute with 'owner=sender'", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
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
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.a.successfulValidationResult
                })

                it("returns an error when passing a Relationship Attribute with 'owner!=sender&owner!=recipient'", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
                    const attribute = await consumptionController.attributes.createConsumptionAttribute({
                        content: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: CoreAddress.from("someOtherAddress")
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: attribute.content
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: "Cannot send Relationship Attributes where you are not the owner."
                    })
                })

                it("returns an error when passing an Identity Attribute with 'owner!=sender' (Identity Attributes for the recipient should always be created via ProposeAttributeRequestItem)", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
                    const attribute = await consumptionController.attributes.createConsumptionAttribute({
                        content: IdentityAttribute.from({
                            value: GivenName.fromAny({ value: "AGivenName" }),
                            owner: recipientAddress
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: attribute.content
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: /Cannot send Identity Attributes where you are not the owner.*/
                    })
                })
            })

            describe("accept", function () {
                it("in case of an IdentityAttribute with 'owner=sender', creates a Consumption Attribute for the peer of the Request", async function () {
                    const senderAddress = CoreAddress.from("CoreAddress")
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: true,
                        attribute: IdentityAttribute.from({
                            owner: senderAddress,
                            value: GivenName.fromAny({ value: "aGivenName" })
                        })
                    })
                    const incomingRequest = ConsumptionRequest.from({
                        id: await ConsumptionIds.request.generate(),
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: senderAddress,
                        status: ConsumptionRequestStatus.DecisionRequired,
                        content: Request.from({
                            items: [requestItem]
                        }),
                        statusLog: []
                    })
                    const result = await processor.accept(
                        requestItem,
                        {
                            accept: true
                        },
                        incomingRequest
                    )
                    const createdAttribute = await consumptionController.attributes.getConsumptionAttribute(
                        result.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(senderAddress.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })

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
