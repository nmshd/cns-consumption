import { serialize, type, validate } from "@js-soft/ts-serval"
import { IRequest, Request } from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    CoreSerializableAsync,
    CoreSynchronizable,
    ICoreAddress,
    ICoreDate,
    ICoreId,
    ICoreSerializableAsync,
    ICoreSynchronizable
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
    @serialize()
    @validate()
    public type: "Message" | "RelationshipTemplate"

    @serialize()
    @validate()
    public reference: CoreId

    public static override from(value: IConsumptionRequestSource): Promise<ConsumptionRequestSource> {
        return super.fromT(value, ConsumptionRequestSource)
    }
}

export interface IConsumptionRequest extends ICoreSynchronizable {
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
export class ConsumptionRequest extends CoreSynchronizable implements IConsumptionRequest {
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

    public sent(source: ConsumptionRequestSource): void {
        if (this.status !== ConsumptionRequestStatus.Draft) {
            throw new Error("Consumption Request has to be in status 'Draft'.")
        }

        this.source = source
        this.changeStatus(ConsumptionRequestStatus.Open)
    }

    public static override async from(value: IConsumptionRequest): Promise<ConsumptionRequest> {
        return await super.fromT<ConsumptionRequest>(value, ConsumptionRequest)
    }
}
