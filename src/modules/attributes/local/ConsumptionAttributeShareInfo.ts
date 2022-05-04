import { serialize, validate } from "@js-soft/ts-serval"
import { CoreAddress, CoreId, CoreSerializable, ICoreAddress, ICoreId, ICoreSerializable } from "@nmshd/transport"

// TODO: JSON

export interface IConsumptionAttributeShareInfo extends ICoreSerializable {
    requestReference: ICoreId
    peer: ICoreAddress
    sourceAttribute?: ICoreId
}

export class ConsumptionAttributeShareInfo extends CoreSerializable implements IConsumptionAttributeShareInfo {
    @validate()
    @serialize()
    public requestReference: CoreId

    @validate()
    @serialize()
    public peer: CoreAddress

    @validate({ nullable: true })
    @serialize()
    public sourceAttribute?: CoreId

    public static from(value: IConsumptionAttributeShareInfo): ConsumptionAttributeShareInfo {
        return super.from(value, ConsumptionAttributeShareInfo) as ConsumptionAttributeShareInfo
    }
}
