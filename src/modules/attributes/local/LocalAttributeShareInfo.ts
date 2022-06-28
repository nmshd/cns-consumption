import { serialize, validate } from "@js-soft/ts-serval"
import { CoreAddress, CoreId, CoreSerializable, ICoreAddress, ICoreId, ICoreSerializable } from "@nmshd/transport"

export interface LocalAttributeShareInfoJSON {
    requestReference: string
    peer: string
    sourceAttribute?: string
}

export interface ILocalAttributeShareInfo extends ICoreSerializable {
    requestReference: ICoreId
    peer: ICoreAddress
    sourceAttribute?: ICoreId
}

export class LocalAttributeShareInfo extends CoreSerializable implements ILocalAttributeShareInfo {
    @validate()
    @serialize()
    public requestReference: CoreId

    @validate()
    @serialize()
    public peer: CoreAddress

    @validate({ nullable: true })
    @serialize()
    public sourceAttribute?: CoreId

    public static from(value: ILocalAttributeShareInfo): LocalAttributeShareInfo {
        return super.fromAny(value) as LocalAttributeShareInfo
    }
}
