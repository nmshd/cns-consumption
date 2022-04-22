import { serialize, type, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreDate, CoreId, CoreSerializableAsync, ICoreDate, ICoreId, ICoreSerializableAsync } from "@nmshd/transport"

export interface IConsumptionResponseSource extends ICoreSerializableAsync {
    type: "Message" | "RelationshipChange"
    reference: ICoreId
}

@type("ConsumptionResponseSource")
export class ConsumptionResponseSource extends CoreSerializableAsync implements IConsumptionResponseSource {
    @serialize()
    @validate()
    public type: "Message" | "RelationshipChange"

    @serialize()
    @validate()
    public reference: CoreId

    public static override async from(value: IConsumptionResponseSource): Promise<ConsumptionResponseSource> {
        return await super.fromT(value, ConsumptionResponseSource)
    }
}

export interface IConsumptionResponse extends ICoreSerializableAsync {
    createdAt: ICoreDate
    content: IResponse
    source?: IConsumptionResponseSource
}

@type("ConsumptionResponse")
export class ConsumptionResponse extends CoreSerializableAsync implements IConsumptionResponse {
    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate()
    public content: Response

    @serialize()
    @validate({ nullable: true })
    public source?: ConsumptionResponseSource

    public static override async from(value: IConsumptionResponse): Promise<ConsumptionResponse> {
        return await super.fromT<ConsumptionResponse>(value, ConsumptionResponse)
    }
}
