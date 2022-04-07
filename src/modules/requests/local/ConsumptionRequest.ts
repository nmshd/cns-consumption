import { serialize, type, validate } from "@js-soft/ts-serval"
import { IRequest, Request } from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    CoreSerializableAsync,
    ICoreAddress,
    ICoreDate,
    ICoreId,
    ICoreSerializableAsync
} from "@nmshd/transport"
import { ConsumptionRequestStatus } from "./ConsumptionRequestStatus"
import { ConsumptionRequestStatusLogEntry, IConsumptionRequestStatusLogEntry } from "./ConsumptionRequestStatusLogEntry"
import { ConsumptionResponse, IConsumptionResponse } from "./ConsumptionResponse"

export interface IConsumptionRequestSource extends ICoreSerializableAsync {
    type: "Message" | "RelationshipTemplate"
    reference: ICoreId
}

@type("ConsumptionRequestSource")
export class ConsumptionRequestSource extends CoreSerializableAsync implements IConsumptionRequestSource {
    @serialize({ type: String })
    @validate()
    public type: "Message" | "RelationshipTemplate"

    @serialize()
    @validate()
    public reference: CoreId
}

export interface IConsumptionRequest extends ICoreSerializableAsync {
    id: ICoreId
    isOwn: boolean
    peer: ICoreAddress
    createdAt: ICoreDate
    content: IRequest
    source?: IConsumptionRequestSource
    response?: IConsumptionResponse
    status: ConsumptionRequestStatus
    statusLog: IConsumptionRequestStatusLogEntry[]
}

@type("ConsumptionRequest")
export class ConsumptionRequest extends CoreSerializableAsync implements IConsumptionRequest {
    @serialize()
    @validate()
    public id: CoreId

    @serialize()
    @validate()
    public isOwn: boolean

    @serialize()
    @validate()
    public peer: CoreAddress

    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate()
    public content: Request

    @serialize()
    @validate({ nullable: true })
    public source?: ConsumptionRequestSource

    @serialize()
    @validate({ nullable: true })
    public response?: ConsumptionResponse

    @serialize()
    @validate()
    public status: ConsumptionRequestStatus

    @serialize({ type: ConsumptionRequestStatusLogEntry })
    @validate()
    public statusLog: ConsumptionRequestStatusLogEntry[]

    public changeStatus(newStatus: ConsumptionRequestStatus): void {
        const logEntry = ConsumptionRequestStatusLogEntry.from({
            createdAt: CoreDate.utc(),
            oldStatus: this.status,
            newStatus
        })

        this.statusLog.push(logEntry)

        this.status = newStatus
    }

    public static override async from(value: IConsumptionRequest): Promise<ConsumptionRequest> {
        return await super.fromT<ConsumptionRequest>(value, ConsumptionRequest)
    }
}
