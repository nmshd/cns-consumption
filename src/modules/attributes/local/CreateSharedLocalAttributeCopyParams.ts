import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/transport"

export interface CreateSharedLocalAttributeCopyParamsJSON {
    attributeId: string
    peer: string
    requestReference: string
}

export interface ICreateSharedLocalAttributeCopyParams extends ISerializable {
    attributeId: ICoreId
    peer: ICoreAddress
    requestReference: ICoreId
}

export class CreateSharedLocalAttributeCopyParams
    extends Serializable
    implements ICreateSharedLocalAttributeCopyParams
{
    @serialize()
    @validate()
    public attributeId: CoreId

    @serialize()
    @validate()
    public peer: CoreAddress

    @serialize()
    @validate()
    public requestReference: CoreId

    public static from(
        value: ICreateSharedLocalAttributeCopyParams | CreateSharedLocalAttributeCopyParamsJSON
    ): CreateSharedLocalAttributeCopyParams {
        return this.fromAny(value)
    }
}
