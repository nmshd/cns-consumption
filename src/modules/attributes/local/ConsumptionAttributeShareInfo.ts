import { serialize, validate } from "@js-soft/ts-serval"
import { CoreAddress, CoreId, CoreSerializable, ICoreAddress, ICoreId, ICoreSerializable } from "@nmshd/transport"

export interface ConsumptionAttributeShareInfoJSON {
    requestReference: string
    peer: string
    sourceAttribute?: string
}

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
        return super.fromAny(value) as ConsumptionAttributeShareInfo
    }
}
