import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/transport"

export interface CreateSharedConsumptionAttributeCopyParamsJSON {
    attributeId: string
    peer: string
    requestReference: string
}

export interface ICreateSharedConsumptionAttributeCopyParams extends ISerializable {
    attributeId: ICoreId
    peer: ICoreAddress
    requestReference: ICoreId
}

export class CreateSharedConsumptionAttributeCopyParams
    extends Serializable
    implements ICreateSharedConsumptionAttributeCopyParams
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
        value: ICreateSharedConsumptionAttributeCopyParams | CreateSharedConsumptionAttributeCopyParamsJSON
    ): CreateSharedConsumptionAttributeCopyParams {
        return this.fromAny(value)
    }
}
