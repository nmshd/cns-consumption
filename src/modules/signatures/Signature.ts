import { serialize, type, validate } from "@js-soft/ts-serval"
import { CoreBuffer, CryptoHash, CryptoSignature, CryptoSignaturePublicKey } from "@nmshd/crypto"
import { CoreCrypto, CoreSerializableAsync, ICoreSerializableAsync } from "@nmshd/transport"
import { ISignatureContent, SignatureContent } from "./SignatureContent"

export interface ISignature extends ICoreSerializableAsync {
    content: ISignatureContent
    signature: string
}

@type("Signature")
export class Signature extends CoreSerializableAsync {
    @validate()
    @serialize()
    public content: SignatureContent

    @validate()
    @serialize()
    public signature: CryptoSignature

    public static async from(value: ISignature): Promise<Signature> {
        const signature = await CryptoSignature.fromBase64(value.signature)
        return await super.fromT<Signature>({ content: value.content, signature: signature }, Signature)
    }

    public static async deserialize(value: string): Promise<Signature> {
        return await super.deserializeT<Signature>(value, Signature)
    }

    public async verify(content: string, publicKey: CryptoSignaturePublicKey): Promise<boolean> {
        const hash = await CryptoHash.hash(CoreBuffer.fromUtf8(content), this.content.hashAlgorithm)
        if (hash.toBase64() !== this.content.hash.hash) return false
        const str = this.content.serialize()
        const correct = await CoreCrypto.verify(CoreBuffer.fromUtf8(str), this.signature, publicKey)
        return correct
    }

    public toJSON(): object {
        return { content: this.content.toJSON(), signature: this.signature.toBase64() }
    }

    public serialize(): string {
        return JSON.stringify(this.toJSON())
    }
}
