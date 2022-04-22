import { serialize, type, validate } from "@js-soft/ts-serval"
import { CoreBuffer, CryptoHash, CryptoSignature, CryptoSignaturePublicKey } from "@nmshd/crypto"
import { CoreCrypto, CoreSerializable, ICoreSerializableAsync } from "@nmshd/transport"
import { ISignatureContent, SignatureContent } from "./SignatureContent"

export interface ISignature extends ICoreSerializableAsync {
    content: ISignatureContent
    signature: string
}

@type("Signature")
export class Signature extends CoreSerializable {
    @validate()
    @serialize()
    public content: SignatureContent

    @validate()
    @serialize()
    public signature: CryptoSignature

    protected static override preFrom(value: any): any {
        if (value.signature instanceof CryptoSignature) {
            value.signature = CryptoSignature.fromBase64(value.signature)
        }

        return value
    }

    public static from(value: ISignature): Signature {
        return this.fromAny(value)
    }

    public async verify(content: string, publicKey: CryptoSignaturePublicKey): Promise<boolean> {
        const hash = await CryptoHash.hash(CoreBuffer.fromUtf8(content), this.content.hashAlgorithm)
        if (hash.toBase64() !== this.content.hash.hash) return false
        const str = this.content.serialize()
        const correct = await CoreCrypto.verify(CoreBuffer.fromUtf8(str), this.signature, publicKey)
        return correct
    }

    public override toJSON(): object {
        return { content: this.content.toJSON(), signature: this.signature.toBase64() }
    }

    public override serialize(): string {
        return JSON.stringify(this.toJSON())
    }
}
