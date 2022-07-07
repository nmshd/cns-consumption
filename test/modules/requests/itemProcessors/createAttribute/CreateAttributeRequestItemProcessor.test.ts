import {
    AcceptCreateAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionIds,
    CreateAttributeRequestItemProcessor,
    LocalRequest,
    LocalRequestStatus
} from "@nmshd/consumption"
import {
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
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
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory"

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
                    const senderAddress = testAccount.identity.address
                    const recipientAddress = CoreAddress.from("recipientAddress")

                    const sourceAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: senderAddress
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: sourceAttribute.content,
                        sourceAttributeId: sourceAttribute.id
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.a.successfulValidationResult()
                })

                it("returns an error when passing a Relationship Attribute with 'owner=sender', but no sourceAttributeId", async function () {
                    const senderAddress = testAccount.identity.address
                    const recipientAddress = CoreAddress.from("recipientAddress")

                    const sourceAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: senderAddress
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: sourceAttribute.content,
                        sourceAttributeId: undefined
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message:
                            /'sourceAttributeId' cannot be undefined when sending an attribute that is not owned by the recipient./
                    })
                })

                it("returns success when passing an Identity Attribute with 'owner=sender'", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
                    const sourceAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: sourceAttribute.content,
                        sourceAttributeId: sourceAttribute.id
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.a.successfulValidationResult()
                })

                it("returns an error when passing an Identity Attribute with 'owner=sender', but no sourceAttributeId", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
                    const sourceAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: sourceAttribute.content,
                        sourceAttributeId: undefined // this should not be valid
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message:
                            /'sourceAttributeId' cannot be undefined when sending an attribute that is not owned by the recipient./
                    })
                })

                it("returns an error when passing a Relationship Attribute with 'owner!=sender'", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
                    const sourceAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: RelationshipAttribute.from({
                            key: "aKey",
                            confidentiality: RelationshipAttributeConfidentiality.Public,
                            value: ProprietaryString.fromAny({ value: "aString" }),
                            owner: CoreAddress.from("ownerAddress")
                        })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attribute: sourceAttribute.content,
                        sourceAttributeId: sourceAttribute.id
                    })
                    const request = Request.from({ items: [requestItem] })

                    const result = await processor.canCreateOutgoingRequestItem(requestItem, request, recipientAddress)

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.consumption.requests.invalidRequestItem",
                        message: /Cannot send Relationship Attributes of which you are not the owner./
                    })
                })

                it("returns an error when passing an Identity Attribute with 'owner!=sender' (Identity Attributes for the recipient should always be created via ProposeAttributeRequestItem)", async function () {
                    const recipientAddress = CoreAddress.from("recipientAddress")
                    const attribute = await consumptionController.attributes.createLocalAttribute({
                        content: TestObjectFactory.createIdentityAttribute({
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
                        message: /Cannot send Identity Attributes of which you are not the owner.*/
                    })
                })
            })

            describe("accept", function () {
                it("in case of an IdentityAttribute with 'owner=sender', creates a Local Attribute for the peer of the Request", async function () {
                    const senderAddress = CoreAddress.from("SenderAddress")
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: true,
                        attribute: TestObjectFactory.createIdentityAttribute({
                            owner: senderAddress
                        })
                    })
                    const incomingRequest = LocalRequest.from({
                        id: await ConsumptionIds.request.generate(),
                        createdAt: CoreDate.utc(),
                        isOwn: false,
                        peer: senderAddress,
                        status: LocalRequestStatus.DecisionRequired,
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
                    const createdAttribute = await consumptionController.attributes.getLocalAttribute(
                        result.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(senderAddress.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })

                it("in case of a RelationshipAttribute, creates a LocalAttribute for the peer of the Request", async function () {
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
                    const acceptParams: AcceptCreateAttributeRequestItemParametersJSON = {
                        accept: true
                    }
                    const result = await processor.accept(requestItem, acceptParams, incomingRequest)
                    const createdAttribute = await consumptionController.attributes.getLocalAttribute(
                        result.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(incomingRequest.peer.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute).to.be.undefined
                })
            })

            describe("applyIncomingResponseItem", function () {
                it("creates a LocalAttribute with the Attribute from the RequestItem and the attributeId from the ResponseItem for the peer of the request ", async function () {
                    const sourceAttribute = await consumptionController.attributes.createLocalAttribute({
                        content: TestObjectFactory.createIdentityAttribute({ owner: testAccount.identity.address })
                    })
                    const requestItem = CreateAttributeRequestItem.from({
                        mustBeAccepted: true,
                        attribute: sourceAttribute.content,
                        sourceAttributeId: sourceAttribute.id
                    })
                    const requestId = await ConsumptionIds.request.generate()
                    const peer = CoreAddress.from("id1")
                    const localRequest = LocalRequest.from({
                        id: requestId,
                        createdAt: CoreDate.utc(),
                        isOwn: true,
                        peer: peer,
                        status: LocalRequestStatus.Open,
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
                    await processor.applyIncomingResponseItem(responseItem, requestItem, localRequest)
                    const createdAttribute = await consumptionController.attributes.getLocalAttribute(
                        responseItem.attributeId
                    )
                    expect(createdAttribute).to.exist
                    expect(createdAttribute!.id.toString()).to.equal(responseItem.attributeId.toString())
                    expect(createdAttribute!.content.toJSON()).to.deep.equal(requestItem.attribute.toJSON())
                    expect(createdAttribute!.shareInfo).to.exist
                    expect(createdAttribute!.shareInfo!.peer.toString()).to.equal(localRequest.peer.toString())
                    expect(createdAttribute!.shareInfo!.sourceAttribute?.toString()).to.equal(
                        sourceAttribute.id.toString()
                    )
                })
            })
        })
    }
}
