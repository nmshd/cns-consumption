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
    CryptoEncryption,
    CryptoEncryptionAlgorithm,
    CryptoExchange,
    CryptoExchangeAlgorithm,
    CryptoSignatureAlgorithm,
    CryptoSignatures
} from "@nmshd/crypto"
import {
    CachedMessage,
    CachedRelationshipTemplate,
    CoreAddress,
    CoreDate,
    CoreId,
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
        return await Message.from({
            id: await CoreId.generate(),
            isOwn: false,
            relationshipIds: [],
            secretKey: await CryptoEncryption.generateKey(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305),
            cache: await CachedMessage.from({
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: await CoreId.generate(),
                receivedByEveryone: false,
                recipients: [
                    {
                        address: recipient,
                        encryptedKey: await CryptoCipher.from({
                            algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce...."),
                            cipher: CoreBuffer.fromUtf8("test")
                        })
                    }
                ]
            })
        })
    }

    public static async createOutgoingMessage(sender: CoreAddress): Promise<Message> {
        return await Message.from({
            id: await CoreId.generate(),
            isOwn: true,
            relationshipIds: [],
            secretKey: await CryptoEncryption.generateKey(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305),
            cache: await CachedMessage.from({
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: sender,
                createdByDevice: await CoreId.generate(),
                receivedByEveryone: false,
                recipients: [
                    {
                        address: CoreAddress.from("id1"),
                        encryptedKey: await CryptoCipher.from({
                            algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305,
                            nonce: CoreBuffer.fromUtf8("some-arbitrary-nonce...."),
                            cipher: CoreBuffer.fromUtf8("test")
                        })
                    }
                ]
            })
        })
    }

    public static async createIncomingRelationshipTemplate(): Promise<RelationshipTemplate> {
        const key = (await CryptoExchange.generateKeypair(CryptoExchangeAlgorithm.ECDH_X25519)).publicKey

        return await RelationshipTemplate.from({
            id: await CoreId.generate(),
            isOwn: false,
            secretKey: await CryptoEncryption.generateKey(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305),
            cache: await CachedRelationshipTemplate.from({
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: CoreAddress.from("id1"),
                createdByDevice: await CoreId.generate(),
                maxNumberOfRelationships: 1,
                identity: {
                    address: CoreAddress.from("id1"),
                    publicKey: (
                        await CryptoSignatures.generateKeypair(CryptoSignatureAlgorithm.ECDSA_ED25519)
                    ).publicKey,
                    realm: Realm.Prod
                },
                templateKey: await RelationshipTemplatePublicKey.from({
                    id: await CoreId.generate(),
                    ...key
                })
            })
        })
    }

    public static async createOutgoingRelationshipTemplate(creator: CoreAddress): Promise<RelationshipTemplate> {
        const key = (await CryptoExchange.generateKeypair(CryptoExchangeAlgorithm.ECDH_X25519)).publicKey

        return await RelationshipTemplate.from({
            id: await CoreId.generate(),
            isOwn: true,
            secretKey: await CryptoEncryption.generateKey(CryptoEncryptionAlgorithm.XCHACHA20_POLY1305),
            cache: await CachedRelationshipTemplate.from({
                content: {},
                createdAt: CoreDate.utc(),
                createdBy: creator,
                createdByDevice: await CoreId.generate(),
                maxNumberOfRelationships: 1,
                identity: {
                    address: creator,
                    publicKey: (
                        await CryptoSignatures.generateKeypair(CryptoSignatureAlgorithm.ECDSA_ED25519)
                    ).publicKey,
                    realm: Realm.Prod
                },
                templateKey: await RelationshipTemplatePublicKey.from({
                    id: await CoreId.generate(),
                    ...key
                })
            })
        })
    }
}
