import {
    AcceptResponseItem,
    IRequest,
    IResponse,
    Request,
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
    IRelationshipTemplate,
    Message,
    Realm,
    RelationshipTemplate,
    RelationshipTemplatePublicKey
} from "@nmshd/transport"
import { TestRequestItem } from "./TestRequestItem"

export class TestObjectFactory {
    public static async createRequest(): Promise<IRequest> {
        return await this.createRequestWithOneItem()
    }

    public static async createRequestWithOneItem(properties: Partial<Request> = {}): Promise<Request> {
        return await Request.from({
            items: [
                await TestRequestItem.from({
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
            requestId: "CNSREQ1",
            items: [
                {
                    "@type": "AcceptResponseItem",
                    result: ResponseItemResult.Accepted
                }
            ]
        }
    }

    public static async createResponse(): Promise<IResponse> {
        return {
            result: ResponseResult.Accepted,
            requestId: CoreId.from("CNSREQ1"),
            items: [
                await AcceptResponseItem.from({
                    result: ResponseItemResult.Accepted
                })
            ]
        }
    }

    public static async createIncomingMessage(recipient: CoreAddress): Promise<Message> {
        return await Message.from(this.createIncomingIMessage(recipient))
    }

    public static createIncomingIMessage(recipient: CoreAddress): IMessage {
        return {
            // @ts-expect-error
            "@type": "Message",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            relationshipIds: [],
            secretKey: new CryptoSecretKey(
                CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            ),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: { id: "senderDeviceId" },
                receivedByEveryone: false,
                recipients: [
                    {
                        address: recipient,
                        encryptedKey: new CryptoCipher(
                            CoreBuffer.fromUtf8("test"),
                            CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                        )
                    }
                ]
            }
        }
    }

    public static async createOutgoingMessage(sender: CoreAddress): Promise<Message> {
        return await Message.from(this.createOutgoingIMessage(sender))
    }

    public static createOutgoingIMessage(sender: CoreAddress): IMessage {
        return {
            // @ts-expect-error
            "@type": "Message",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            relationshipIds: [],
            secretKey: new CryptoSecretKey(
                CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            ),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: sender,
                createdByDevice: { id: "senderDeviceId" },
                receivedByEveryone: false,
                recipients: [
                    {
                        address: CoreAddress.from("id1"),
                        encryptedKey: new CryptoCipher(
                            CoreBuffer.fromUtf8("test"),
                            CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            CoreBuffer.fromUtf8("some-arbitrary-nonce....")
                        )
                    }
                ]
            }
        }
    }

    public static async createIncomingRelationshipTemplate(): Promise<RelationshipTemplate> {
        return await RelationshipTemplate.from(this.createIncomingIRelationshipTemplate())
    }

    public static createIncomingIRelationshipTemplate(): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: false,
            secretKey: new CryptoSecretKey(
                CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            ),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: { id: "senderDeviceId" },
                maxNumberOfRelationships: 1,
                identity: {
                    address: CoreAddress.from("id1"),
                    publicKey: new CryptoSignaturePublicKey(
                        CryptoSignatureAlgorithm.ECDSA_ED25519,
                        CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                    ),
                    realm: Realm.Prod
                },
                templateKey: new RelationshipTemplatePublicKey(
                    CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                    CryptoExchangeAlgorithm.ECDH_X25519,
                    CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
                )
            }
        }
    }

    public static async createOutgoingRelationshipTemplate(creator: CoreAddress): Promise<RelationshipTemplate> {
        return await RelationshipTemplate.from(this.createOutgoingIRelationshipTemplate(creator))
    }

    public static createOutgoingIRelationshipTemplate(creator: CoreAddress): IRelationshipTemplate {
        return {
            // @ts-expect-error
            "@type": "RelationshipTemplate",
            id: { id: "b9uMR7u7lsKLzRfVJNYb" },
            isOwn: true,
            secretKey: new CryptoSecretKey(
                CoreBuffer.from("ERt3WazEKVtoyjBoBx2JJu1tkkC4QIW3gi9uM00nI3o"),
                CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            ),
            cache: {
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: creator,
                createdByDevice: CoreId.from("senderDeviceId"),
                maxNumberOfRelationships: 1,
                identity: {
                    address: creator,
                    publicKey: new CryptoSignaturePublicKey(
                        CryptoSignatureAlgorithm.ECDSA_ED25519,
                        CoreBuffer.fromBase64URL("aS-A8ywidL00DfBlZySOG_1-NdSBW38uGD1il_Ymk5g")
                    ),
                    realm: Realm.Prod
                },
                templateKey: new RelationshipTemplatePublicKey(
                    CoreId.from("b9uMR7u7lsKLzRfVJNYb"),
                    CryptoExchangeAlgorithm.ECDH_X25519,
                    CoreBuffer.fromBase64URL("sSguQOayzLgmPMclpfbPzpKU9F8CkPYuzBtuaWgnFyo")
                )
            }
        }
    }
}
