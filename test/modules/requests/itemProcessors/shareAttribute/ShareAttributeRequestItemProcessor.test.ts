import {
    AcceptShareAttributeRequestItemParametersJSON,
    ConsumptionController,
    ConsumptionRequest,
    ConsumptionRequestInfo,
    ICreateOutgoingRequestParameters,
    ISentOutgoingRequestParameters,
    OutgoingRequestsController,
    RequestItemProcessorRegistry,
    ShareAttributeRequestItemProcessor
} from "@nmshd/consumption"
import {
    AbstractAttributeValue,
    CreateAttributeRequestItem,
    GivenName,
    IdentityAttribute,
    RelationshipAttribute,
    Request,
    ShareAttributeRequestItem
} from "@nmshd/content"
import { AccountController, CoreAddress, CoreId, SynchronizedCollection, Transport } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import { IntegrationTest } from "../../../../core/IntegrationTest"
import { TestUtil } from "../../../../core/TestUtil"
import { TestObjectFactory } from "../../testHelpers/TestObjectFactory"

class MockOutgoingRequestsController extends OutgoingRequestsController {
    public createWasCalledWith?: ICreateOutgoingRequestParameters
    public sentWasCalled: boolean
    public sentWasCalledWith?: ISentOutgoingRequestParameters

    public constructor(
        consumptionRequests: SynchronizedCollection,
        processorRegistry: RequestItemProcessorRegistry,
        parent: ConsumptionController
    ) {
        super(consumptionRequests, processorRegistry, parent)
    }

    public override async create(params: ICreateOutgoingRequestParameters): Promise<ConsumptionRequest> {
        this.createWasCalledWith = params
        return await super.create(params)
    }

    public override async sent(params: ISentOutgoingRequestParameters): Promise<ConsumptionRequest> {
        this.sentWasCalledWith = params
        this.sentWasCalled = true
        return await super.sent(params)
    }
}

export class ShareAttributeRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        const that = this

        describe.only("ShareAttributeRequestItemProcessor", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)

            let consumptionController1: ConsumptionController
            let accountController1: AccountController
            let consumptionController2: ConsumptionController
            let accountController2: AccountController

            let processor1: ShareAttributeRequestItemProcessor
            let processor2: ShareAttributeRequestItemProcessor
            let mockOutgoingRequestsController1: MockOutgoingRequestsController
            let mockOutgoingRequestsController2: MockOutgoingRequestsController

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 2)
                ;({ accountController: accountController1, consumptionController: consumptionController1 } =
                    accounts[0])
                ;({ accountController: accountController2, consumptionController: consumptionController2 } =
                    accounts[1])

                mockOutgoingRequestsController1 = new MockOutgoingRequestsController(
                    consumptionController1["_outgoingRequests"]["consumptionRequests"],
                    consumptionController1["_outgoingRequests"]["processorRegistry"],
                    consumptionController1
                )
                consumptionController1["_outgoingRequests"] = mockOutgoingRequestsController1
                mockOutgoingRequestsController2 = new MockOutgoingRequestsController(
                    consumptionController2["_outgoingRequests"]["consumptionRequests"],
                    consumptionController2["_outgoingRequests"]["processorRegistry"],
                    consumptionController2
                )
                consumptionController2["_outgoingRequests"] = mockOutgoingRequestsController2

                await TestUtil.addRelationship(accountController1, accountController2)
            })

            this.beforeEach(function () {
                processor1 = new ShareAttributeRequestItemProcessor(consumptionController1)
                processor2 = new ShareAttributeRequestItemProcessor(consumptionController2)
            })

            describe("canCreateOutgoingRequestItem", function () {
                itParam(
                    "can only share IdentityAttributes with owner==recipient (=> ${value.details})",
                    [
                        {
                            details: "succeeds when owner=recipient",
                            owner: "recipient"
                        },
                        {
                            details: "fails when owner=sender",
                            owner: "sender",
                            expectedErrorCode: "error.consumption.requests.invalidRequestItem",
                            expectedErrorMessage:
                                "Can only request sharing of identity attributes owned by the recipient."
                        },
                        {
                            details: "fails when owner=anyOtherIdentity",
                            owner: "anyOtherIdentity",
                            expectedErrorCode: "error.consumption.requests.invalidRequestItem",
                            expectedErrorMessage:
                                "Can only request sharing of identity attributes owned by the recipient."
                        }
                    ],
                    async function (testParams) {
                        const sConsumptionController = consumptionController1
                        const rAccountController = accountController2

                        let attributeOwner: CoreAddress
                        switch (testParams.owner) {
                            case "recipient":
                                attributeOwner = rAccountController.identity.address
                                break
                            case "sender":
                                attributeOwner = sConsumptionController.accountController.identity.address
                                break
                            default:
                                attributeOwner = CoreAddress.from(testParams.owner)
                                break
                        }

                        const attribute = await sConsumptionController.attributes.createPeerConsumptionAttribute({
                            content: TestObjectFactory.createIdentityAttribute({
                                owner: attributeOwner
                            }),
                            peer: rAccountController.identity.address,
                            requestReference: CoreId.from("requestReference")
                        })
                        const requestItem = ShareAttributeRequestItem.from({
                            mustBeAccepted: false,
                            attributeId: attribute.id,
                            shareWith: CoreAddress.from("thirdPartyAddress")
                        })

                        const result = await processor1.canCreateOutgoingRequestItem(
                            requestItem,
                            Request.from({ items: [requestItem] }),
                            rAccountController.identity.address
                        )

                        if (testParams.expectedErrorCode || testParams.expectedErrorMessage) {
                            expect(result).to.be.an.errorValidationResult({
                                code: testParams.expectedErrorCode,
                                message: testParams.expectedErrorMessage
                            })
                        } else {
                            expect(result).to.be.a.successfulValidationResult()
                        }
                    }
                )

                itParam(
                    "cannot share RelationshipAttributes with owner!=sender&&owner!=recipient (=> ${value.details})",
                    [
                        {
                            details: "succeeds when owner=recipient",
                            owner: "recipient"
                        },
                        {
                            details: "succeeds when owner=sender",
                            owner: "sender"
                        },
                        {
                            details: "fails when owner=anyOtherIdentity",
                            owner: "anyOtherIdentity",
                            expectedErrorCode: "error.consumption.requests.invalidRequestItem",
                            expectedErrorMessage:
                                "Cannot request sharing of relationship attributes not owned by recipient or sender."
                        }
                    ],
                    async function (testParams) {
                        const sConsumptionController = consumptionController1
                        const rAccountController = accountController2

                        let attributeOwner: CoreAddress
                        switch (testParams.owner) {
                            case "recipient":
                                attributeOwner = rAccountController.identity.address
                                break
                            case "sender":
                                attributeOwner = sConsumptionController.accountController.identity.address
                                break
                            default:
                                attributeOwner = CoreAddress.from(testParams.owner)
                                break
                        }

                        const attribute = await sConsumptionController.attributes.createPeerConsumptionAttribute({
                            content: TestObjectFactory.createRelationshipAttribute({
                                owner: attributeOwner
                            }),
                            peer: rAccountController.identity.address,
                            requestReference: CoreId.from("requestReference")
                        })
                        const requestItem = ShareAttributeRequestItem.from({
                            mustBeAccepted: false,
                            attributeId: attribute.id,
                            shareWith: CoreAddress.from("thirdPartyAddress")
                        })

                        const result = await processor1.canCreateOutgoingRequestItem(
                            requestItem,
                            Request.from({ items: [requestItem] }),
                            rAccountController.identity.address
                        )

                        if (testParams.expectedErrorCode || testParams.expectedErrorMessage) {
                            expect(result).to.be.an.errorValidationResult({
                                code: testParams.expectedErrorCode,
                                message: testParams.expectedErrorMessage
                            })
                        } else {
                            expect(result).to.be.a.successfulValidationResult()
                        }
                    }
                )

                it("returns an error when passing a non-existing id", async function () {
                    const requestItem = ShareAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attributeId: CoreId.from("nonExistingAttributeId"),
                        shareWith: CoreAddress.from("recipientAddress")
                    })

                    const result = await processor1.canCreateOutgoingRequestItem(
                        requestItem,
                        Request.from({ items: [requestItem] }),
                        CoreAddress.from("recipientAddress")
                    )

                    expect(result).to.be.an.errorValidationResult({
                        code: "error.transport.recordNotFound",
                        message: ".*Attribute.*"
                    })
                })
            })

            describe("checkPrerequisitesOfIncomingRequestItem", function () {
                itParam(
                    "can only share IdentityAttributes with owner==recipient (=> ${value.details})",
                    [
                        {
                            details: "returns true when owner=recipient",
                            owner: "recipient",
                            expectedResult: true
                        },
                        {
                            details: "returns false when owner=sender",
                            owner: "sender",
                            expectedResult: false
                        },
                        {
                            details: "returns false when owner=anyOtherIdentity",
                            owner: "anyOtherIdentity",
                            expectedResult: false
                        }
                    ],
                    async function (testParams) {
                        const shareWithAccountController = accountController1
                        const senderAddress = CoreAddress.from("senderAddress")
                        const rAccountController = accountController2
                        const rConsumptionController = consumptionController2
                        const rProcessor = processor2

                        let attributeOwner: CoreAddress
                        switch (testParams.owner) {
                            case "recipient":
                                attributeOwner = rAccountController.identity.address
                                break
                            case "sender":
                                attributeOwner = senderAddress
                                break
                            default:
                                attributeOwner = CoreAddress.from(testParams.owner)
                                break
                        }

                        const attribute = await rConsumptionController.attributes.createPeerConsumptionAttribute({
                            content: TestObjectFactory.createIdentityAttribute({
                                owner: attributeOwner
                            }),
                            peer: senderAddress, // TODO: not correctXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                            requestReference: CoreId.from("requestReference")
                        })
                        const requestItem = ShareAttributeRequestItem.from({
                            mustBeAccepted: false,
                            attributeId: attribute.id,
                            shareWith: shareWithAccountController.identity.address
                        })
                        const requestInfo: ConsumptionRequestInfo = {
                            id: CoreId.from("requestId"),
                            peer: senderAddress
                        }

                        const result = await rProcessor.checkPrerequisitesOfIncomingRequestItem(
                            requestItem,
                            requestInfo
                        )

                        expect(result).to.equal(testParams.expectedResult)
                    }
                )

                itParam(
                    "cannot share RelationshipAttributes with owner!=sender&&owner!=recipient (=> ${value.details})",
                    [
                        {
                            details: "returns true when owner=recipient",
                            owner: "recipient",
                            expectedResult: true
                        },
                        {
                            details: "returns true when owner=sender",
                            owner: "sender",
                            expectedResult: true
                        },
                        {
                            details: "returns false when owner=anyOtherIdentity",
                            owner: "anyOtherIdentity",
                            expectedResult: false
                        }
                    ],
                    async function (testParams) {
                        const shareWithAccountController = accountController1
                        const senderAddress = CoreAddress.from("senderAddress")
                        const rAccountController = accountController2
                        const rConsumptionController = consumptionController2
                        const rProcessor = processor2

                        let attributeOwner: CoreAddress
                        switch (testParams.owner) {
                            case "recipient":
                                attributeOwner = rAccountController.identity.address
                                break
                            case "sender":
                                attributeOwner = senderAddress
                                break
                            default:
                                attributeOwner = CoreAddress.from(testParams.owner)
                                break
                        }

                        const attribute = await rConsumptionController.attributes.createPeerConsumptionAttribute({
                            content: TestObjectFactory.createRelationshipAttribute({
                                owner: attributeOwner
                            }),
                            peer: senderAddress,
                            requestReference: CoreId.from("requestReference")
                        })
                        const requestItem = ShareAttributeRequestItem.from({
                            mustBeAccepted: false,
                            attributeId: attribute.id,
                            shareWith: shareWithAccountController.identity.address
                        })
                        const requestInfo: ConsumptionRequestInfo = {
                            id: CoreId.from("requestId"),
                            peer: senderAddress
                        }

                        const result = await rProcessor.checkPrerequisitesOfIncomingRequestItem(
                            requestItem,
                            requestInfo
                        )

                        expect(result).to.equal(testParams.expectedResult)
                    }
                )

                it("returns false when there is no relationship to the identity in 'shareWith' (a relationship is needed in order to send the response anyway).", async function () {
                    const recipientConsumptionController = consumptionController2
                    const recipientProcessor = processor2

                    const attribute = await recipientConsumptionController.attributes.createConsumptionAttribute({
                        content: TestObjectFactory.createIdentityAttribute({
                            owner: CoreAddress.from("someOwner")
                        })
                    })

                    const requestItem = ShareAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attributeId: attribute.id,
                        shareWith: CoreAddress.from("someAddressWithNoRelationshipTo")
                    })
                    const requestInfo: ConsumptionRequestInfo = {
                        id: CoreId.from("requestId"),
                        peer: CoreAddress.from("senderAddress")
                    }

                    const result = await recipientProcessor.checkPrerequisitesOfIncomingRequestItem(
                        requestItem,
                        requestInfo
                    )

                    expect(result).to.be.false
                })

                it("returns false when there is no attribute with the given id.", async function () {
                    const shareWithAccountController = accountController1
                    const recipientProcessor = processor2

                    const requestItem = ShareAttributeRequestItem.from({
                        mustBeAccepted: false,
                        attributeId: CoreId.from("nonExistingAttributeId"),
                        shareWith: shareWithAccountController.identity.address
                    })
                    const requestInfo: ConsumptionRequestInfo = {
                        id: CoreId.from("requestId"),
                        peer: CoreAddress.from("senderAddress")
                    }

                    const result = await recipientProcessor.checkPrerequisitesOfIncomingRequestItem(
                        requestItem,
                        requestInfo
                    )

                    expect(result).to.be.false
                })
            })

            describe("canAccept", function () {
                it("always succeeds since there are no input parameters", function () {
                    const requestItem: ShareAttributeRequestItem = undefined! // is not used in canAccept anyway
                    const request: ConsumptionRequest = undefined!
                    const acceptParams: AcceptShareAttributeRequestItemParametersJSON = { accept: true }

                    const result = processor2.canAccept(requestItem, acceptParams, request)

                    expect(result).to.be.a.successfulValidationResult()
                })
            })

            describe("accept", function () {
                it("sends a Request with a CreateAttributeRequestItem to the identity specified in shareWith", async function () {
                    const shareWithAccountController = accountController1
                    const recipientConsumptionController = consumptionController2
                    const recipientProcessor = processor2

                    const attribute = await recipientConsumptionController.attributes.createConsumptionAttribute({
                        content: TestObjectFactory.createIdentityAttribute({
                            owner: recipientConsumptionController.accountController.identity.address
                        })
                    })

                    const requestItem = ShareAttributeRequestItem.from({
                        attributeId: attribute.id,
                        mustBeAccepted: false,
                        shareWith: shareWithAccountController.identity.address
                    })
                    const request: ConsumptionRequest = undefined! // is not used in accept anyway
                    const acceptParams: AcceptShareAttributeRequestItemParametersJSON = { accept: true }

                    await recipientProcessor.accept(requestItem, acceptParams, request)

                    // ensure a request was created with the correct recipient
                    expect(mockOutgoingRequestsController2.createWasCalledWith!.peer.address).to.equal(
                        requestItem.shareWith.address
                    )

                    // ensure the request was sent
                    expect(mockOutgoingRequestsController2.sentWasCalled).to.be.true

                    const sentCreateAttributeRequest = mockOutgoingRequestsController2.sentWasCalledWith!
                        .requestSourceObject.cache!.content as Request

                    // ensure the request contains the correct request item
                    expect(sentCreateAttributeRequest).to.be.instanceOf(Request)
                    expect(sentCreateAttributeRequest.items[0]).to.be.instanceOf(CreateAttributeRequestItem)

                    const sentRequestItem = sentCreateAttributeRequest.items[0] as CreateAttributeRequestItem
                    const recipientOfCreateAttributeRequest =
                        mockOutgoingRequestsController2.sentWasCalledWith!.requestSourceObject.cache!.recipients[0]

                    // ensure the Message the request was sent with was sent to the correct recipient
                    expect(recipientOfCreateAttributeRequest.address.address).to.equal(
                        shareWithAccountController.identity.address.toString()
                    )

                    const sentAttribute = sentRequestItem.attribute

                    // ensure the correct attribute was sent
                    expect(sentAttribute.toJSON()).to.deep.equal(attribute.content.toJSON())
                })
            })
        })
    }
}

export abstract class RequestItemBuilder {
    protected _mustBeAccepted?: boolean
    protected _responseMetadata?: object

    public mustBeAccepted(mustBeAccepted: boolean): this {
        this._mustBeAccepted = mustBeAccepted
        return this
    }

    public responseMetadata(metadata: object): this {
        this._responseMetadata = metadata
        return this
    }
}

export class CreateAttributeRequestItemMother {
    public static buildValid(): CreateAttributeRequestItemBuilder {
        return new CreateAttributeRequestItemBuilder()
            .mustBeAccepted(false)
            .withAttribute(IdentityAttributeMother.valid().build())
    }
}

export class CreateAttributeRequestItemBuilder extends RequestItemBuilder {
    private _attribute?: IdentityAttribute | RelationshipAttribute

    public static create(): CreateAttributeRequestItemBuilder {
        return new CreateAttributeRequestItemBuilder()
    }

    public withAttribute(attribute: IdentityAttribute | RelationshipAttribute): this {
        this._attribute = attribute
        return this
    }

    public build(customize?: (obj: CreateAttributeRequestItem) => void): CreateAttributeRequestItem {
        const obj = CreateAttributeRequestItem.from({
            attribute: ensureValue(this._attribute),
            mustBeAccepted: ensureValue(this._mustBeAccepted),
            responseMetadata: this._responseMetadata
        })
        if (customize) customize(obj)
        return obj
    }
}

export class ShareAttributeRequestItemMother {
    public static buildValid(): ShareAttributeRequestItemBuilder {
        return new ShareAttributeRequestItemBuilder()
            .mustBeAccepted(false)
            .attributeId(CoreId.from("someAttributeId"))
            .shareWith(CoreAddress.from("someThirdParty"))
    }
}

export class ShareAttributeRequestItemBuilder extends RequestItemBuilder {
    private _attributeId?: CoreId
    private _shareWith: CoreAddress

    public static create(): ShareAttributeRequestItemBuilder {
        return new ShareAttributeRequestItemBuilder()
    }

    public attributeId(attributeId: CoreId): this {
        this._attributeId = attributeId
        return this
    }

    public shareWith(shareWith: CoreAddress): this {
        this._shareWith = shareWith
        return this
    }

    public build(customize?: (obj: ShareAttributeRequestItem) => void): ShareAttributeRequestItem {
        const obj = ShareAttributeRequestItem.from({
            attributeId: ensureValue(this._attributeId),
            shareWith: ensureValue(this._shareWith),
            mustBeAccepted: ensureValue(this._mustBeAccepted),
            responseMetadata: this._responseMetadata
        })
        if (customize) customize(obj)
        return obj
    }
}

export class IdentityAttributeMother {
    public static valid(): IdentityAttributeBuilder {
        return new IdentityAttributeBuilder()
            .owner(CoreAddress.from("ownerAddress"))
            .value(GivenName.fromAny({ value: "givenName" }))
    }
}

export class IdentityAttributeBuilder {
    private _owner: CoreAddress = CoreAddress.from("someOwner")
    private _value: AbstractAttributeValue

    public static create(): IdentityAttributeBuilder {
        return new IdentityAttributeBuilder()
    }

    public owner(owner: CoreAddress): this {
        this._owner = owner
        return this
    }

    public value(value: AbstractAttributeValue): this {
        this._value = value
        return this
    }

    public build(customize?: (obj: IdentityAttribute) => void): IdentityAttribute {
        const obj = IdentityAttribute.from({
            value: ensureValue(this._value),
            owner: ensureValue(this._owner)
        })
        if (customize) customize(obj)
        return obj
    }
}

export class MissingAttributeError extends Error {
    public constructor() {
        super("Missing attribute")
    }
}

function ensureValue<T>(value?: T): T {
    if (value === undefined) {
        throw new MissingAttributeError()
    }

    return value
}