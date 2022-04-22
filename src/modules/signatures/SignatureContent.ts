import { serialize, type, validate } from "@js-soft/ts-serval"
import { CryptoHashAlgorithm, CryptoSignatureAlgorithm } from "@nmshd/crypto"
import { CoreAddress, CoreDate, CoreHash, CoreId, CoreSerializable, ICoreSerializable } from "@nmshd/transport"

export interface ISignatureContent extends ICoreSerializable {
    version: number
    signatureAlgorithm: CryptoSignatureAlgorithm
    hashAlgorithm: CryptoHashAlgorithm
    signedAt: string
    signer: string
    keyId: string
    hash: string
}

@type("SignatureContent")
export class SignatureContent extends CoreSerializable {
    @validate()
    @serialize()
    public version: number

    @validate()
    @serialize()
    public signatureAlgorithm: CryptoSignatureAlgorithm

    @validate()
    @serialize()
    public hashAlgorithm: CryptoHashAlgorithm

    @validate()
    @serialize()
    public signedAt: CoreDate

    @validate()
    @serialize()
    public signer: CoreAddress

    @validate()
    @serialize()
    public keyId: CoreId

    @validate()
    @serialize()
    public hash: CoreHash

    public static override from(value: ISignatureContent): SignatureContent {
        return super.from(value, SignatureContent) as SignatureContent
    }

    public static override deserialize(value: string): SignatureContent {
        return super.deserializeT<SignatureContent>(value, SignatureContent)
    }
}
