import {
    AcceptResponseItem,
    IRelationshipCreationChangeRequestBody,
    IRelationshipTemplateBody,
    IRequest,
    IResponse,
    Request,
    RequestItemGroup,
    ResponseItemResult,
    ResponseJSON,
    ResponseResult
} from "@nmshd/content"
import {
    CoreBuffer,
    CryptoCipher,
    CryptoEncryptionAlgorithm,
    CryptoExchangeAlgorithm,
    CryptoSecretKey,
    CryptoSignatureAlgorithm,
    CryptoSignaturePublicKey
} from "@nmshd/crypto"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    IMessage,
    IRelationshipChange,
    IRelationshipTemplate,
    Message,
    Realm,
    RelationshipChangeStatus,
    RelationshipChangeType,
    RelationshipTemplate,
    RelationshipTemplatePublicKey
} from "@nmshd/transport"
import { TestRequestItem } from "./TestRequestItem"

export class TestObjectFactory {
    public static createRequest(): IRequest {
        return this.createRequestWithOneItem()
    }

    public static createRequestWithOneItem(properties: Partial<Request> = {}, mustBeAccepted = false): Request {
        return Request.from({
            items: [
                TestRequestItem.from({
                    mustBeAccepted: mustBeAccepted
                })
            ],
            ...properties
        })
    }

    public static createRequestWithOneItemGroup(properties: Partial<Request> = {}, mustBeAccepted = false): Request {
        return Request.from({
            items: [
                RequestItemGroup.from({
                    items: [TestRequestItem.from({ mustBeAccepted: mustBeAccepted })],
                    mustBeAccepted: mustBeAccepted
                })
            ],
            ...properties
        })
    }

    public static createRequestWithTwoItems(properties: Partial<Request> = {}): Request {
        return Request.from({
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false
                }),
                TestRequestItem.from({
                    mustBeAccepted: false
                })
            ],
            ...properties
        })
    }

    public static createResponseJSON(): ResponseJSON {
        return {
            "@type": "Response",
            result: ResponseResult.Accepted,
            requestId: "REQ1",
            items: [
                {
                    "@type": "AcceptResponseItem",
                    result: ResponseItemResult.Accepted
                }
            ]
        }
    }

    public static createResponse(): IResponse {
        return {
            result: ResponseResult.Accepted,
            requestId: CoreId.from("REQ1"),
            items: [
                AcceptResponseItem.from({
                    result: ResponseItemResult.Accepted
                })
            ]
        }
    }

    public static createIncomingMessage(recipient: CoreAddress): Message {
        return Message.from(this.createIncomingIMessage(recipient))
    }

    public static createIncomingIMessage(recipient: CoreAddress): IMessage {
        return {
            // @ts-expect-error
            "@type": "Message",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            relationshipIds: [],
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: { id: "senderDeviceId" },
                receivedByEveryone: false,
                recipients: [
                    {
                        address: recipient,
                        encryptedKey: CryptoCipher.from({
                            cipher: CoreBuffer.fromUtf8("test"),
                            algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                        })
                    }
                ]
            }
        }
    }

    public static createOutgoingMessage(sender: CoreAddress): Message {
        return Message.from(this.createOutgoingIMessage(sender))
    }

    public static createOutgoingIMessage(sender: CoreAddress): IMessage {
        return {
            // @ts-expect-error
            "@type": "Message",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            relationshipIds: [],
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: sender,
                createdByDevice: { id: "senderDeviceId" },
                receivedByEveryone: false,
                recipients: [
                    {
                        address: CoreAddress.from("id1"),
                        encryptedKey: CryptoCipher.from({
                            cipher: CoreBuffer.fromUtf8("test"),
                            algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                        })
                    }
                ]
            }
        }
    }

    public static createIncomingRelationshipTemplate(): RelationshipTemplate {
        return RelationshipTemplate.from(this.createIncomingIRelationshipTemplate())
    }

    public static createIncomingIRelationshipChange(
        type: RelationshipChangeType,
        requestId?: string
    ): IRelationshipChange {
        return {
            // @ts-expect-error
            "@type": "RelationshipChange",
            id: CoreId.from("RCH1"),
            relationshipId: CoreId.from("REL1"),
            type: type,
            status: RelationshipChangeStatus.Pending,
            request: {
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: CoreId.from("DVC1"),
                content: {
                    "@type": "RelationshipCreationChangeRequestBody",
                    response: {
                        "@type": "Response",
                        result: ResponseResult.Accepted,
                        items: [
                            {
                                // @ts-expect-error
                                "@type": "AcceptResponseItem",
                                result: ResponseItemResult.Accepted
                            }
                        ],
                        requestId: CoreId.from(requestId ?? "REQ1")
                    } as IResponse
                } as IRelationshipCreationChangeRequestBody
            }
        }
    }

    public static createOutgoingIRelationshipChange(
        type: RelationshipChangeType,
        sender: CoreAddress
    ): IRelationshipChange {
        return {
            // @ts-expect-error
            "@type": "RelationshipChange",
            id: CoreId.from("RCH1"),
            relationshipId: CoreId.from("REL1"),
            type: type,
            status: RelationshipChangeStatus.Pending,
            request: {
                createdAt: CoreDate.utc(),
                createdBy: sender,
                createdByDevice: CoreId.from("DVC1")
            }
        }
    }

    public static createIncomingIRelationshipTemplate(): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: { id: "senderDeviceId" },
                maxNumberOfRelationships: 1,
                identity: {
                    address: CoreAddress.from("id1"),
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                    }),
                    realm: Realm.Prod
                },
                templateKey: RelationshipTemplatePublicKey.from({
                    id: CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                    algorithm: CryptoExchangeAlgorithm.ECDH_X25519,
                    publicKey: CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
                })
            }
        }
    }

    public static createOutgoingRelationshipTemplate(creator: CoreAddress): RelationshipTemplate {
        return RelationshipTemplate.from(this.createOutgoingIRelationshipTemplate(creator))
    }

    public static createOutgoingIRelationshipTemplate(
        creator: CoreAddress,
        content?: IRequest | IRelationshipTemplateBody
    ): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            secretKey: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            }),
            cache: {
                content: content ?? {},
                createdAt: CoreDate.utc(),
                createdBy: creator,
                createdByDevice: CoreId.from("senderDeviceId"),
                maxNumberOfRelationships: 1,
                identity: {
                    address: creator,
                    publicKey: CryptoSignaturePublicKey.from({
                        algorithm: CryptoSignatureAlgorithm.ECDSA_ED25519,
                        publicKey: CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                    }),
                    realm: Realm.Prod
                },
                templateKey: RelationshipTemplatePublicKey.from({
                    id: CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                    algorithm: CryptoExchangeAlgorithm.ECDH_X25519,
                    publicKey: CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
                })
            }
        }
    }
}
