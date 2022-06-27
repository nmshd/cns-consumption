import { serialize, type, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreDate, CoreId, CoreSerializable, ICoreDate, ICoreId, ICoreSerializable } from "@nmshd/transport"

export interface IConsumptionResponseSource extends ICoreSerializable {
    type: "Message" | "RelationshipChange"
    reference: ICoreId
}

@type("ConsumptionResponseSource")
export class ConsumptionResponseSource extends CoreSerializable implements IConsumptionResponseSource {
    @serialize()
    @validate()
    public type: "Message" | "RelationshipChange"

    @serialize()
    @validate()
    public reference: CoreId

    public static from(value: IConsumptionResponseSource): ConsumptionResponseSource {
        return this.fromAny(value)
    }
}

export interface IConsumptionResponse extends ICoreSerializable {
    createdAt: ICoreDate
    content: IResponse
    source?: IConsumptionResponseSource
}

@type("ConsumptionResponse")
export class ConsumptionResponse extends CoreSerializable implements IConsumptionResponse {
    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate()
    public content: Response

    @serialize()
    @validate({ nullable: true })
    public source?: ConsumptionResponseSource

    public static from(value: IConsumptionResponse): ConsumptionResponse {
        return this.fromAny(value)
    }
}
