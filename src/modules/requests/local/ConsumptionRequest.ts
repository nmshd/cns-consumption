import { serialize, type, validate } from "@js-soft/ts-serval"
import { ContentJSON, IRequest, IResponse, Request, RequestJSON, Response, ResponseJSON } from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    CoreSerializable,
    CoreSerializableAsync,
    ICoreAddress,
    ICoreDate,
    ICoreId,
    ICoreSerializable,
    ICoreSerializableAsync
} from "@nmshd/transport"

export enum ConsumptionRequestStatus {
    Open = "Open",
    Checked = "Checked",
    DecisionRequired = "DecisionRequired",
    ManualDecisionRequired = "ManualDecisionRequired",
    Error = "Error",
    Completed = "Completed"
}

/** ************************************JSON**************************************/
export interface ConsumptionRequestJSON extends ContentJSON {
    id: string
    isOwn: boolean
    peer: string
    createdAt: string
    sourceType: string
    sourceReference: string
    response?: ConsumptionResponseJSON
    status: ConsumptionRequestStatus
    statusLog: ConsumptionRequestStatusLogEntryJSON[]
    content: RequestJSON
}

export interface ConsumptionResponseJSON extends ContentJSON {
    createdAt: string
    content: ResponseJSON
    sourceType?: string
    sourceReference?: string
}

export interface ConsumptionResponseDraftJSON extends ContentJSON {
    createdAt: string
    content: ResponseJSON
}

export interface ConsumptionRequestStatusLogEntryJSON extends ContentJSON {
    createdAt: string
    oldStatus: ConsumptionRequestStatus
    newStatus: ConsumptionRequestStatus
    data?: object
    code?: string
}

/** ************************************Interfaces**************************************/
export interface IConsumptionRequest extends ICoreSerializableAsync {
    id: ICoreId
    isOwn: boolean
    peer: ICoreAddress
    createdAt: ICoreDate
    content: IRequest
    sourceType: string
    sourceReference: ICoreId
    response?: IConsumptionResponse | IConsumptionResponseDraft
    status: ConsumptionRequestStatus
    statusLog: IConsumptionRequestStatusLogEntry[]
}

export interface IConsumptionResponse extends ICoreSerializableAsync {
    createdAt: ICoreDate
    content: IResponse
    sourceType: string
    sourceReference: ICoreId
}

export interface IConsumptionResponseDraft extends ICoreSerializableAsync {
    createdAt: ICoreDate
    content: IResponse
}

export interface IConsumptionRequestStatusLogEntry extends ICoreSerializable {
    createdAt: ICoreDate
    oldStatus: ConsumptionRequestStatus
    newStatus: ConsumptionRequestStatus
    data?: object
    code?: string
}

/** ************************************Classes**************************************/

@type("ConsumptionResponse")
export class ConsumptionResponse extends CoreSerializableAsync implements IConsumptionResponse {
    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate()
    public sourceType: string

    @serialize()
    @validate()
    public sourceReference: CoreId

    @serialize()
    @validate()
    public content: Response

    public static async from(value: IConsumptionResponse | ConsumptionResponseJSON): Promise<ConsumptionResponse> {
        return await super.fromT<ConsumptionResponse>(value, ConsumptionResponse)
    }
}

@type("ConsumptionResponseDraft")
export class ConsumptionResponseDraft extends CoreSerializableAsync implements IConsumptionResponseDraft {
    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate()
    public content: Response

    public static async from(
        value: IConsumptionResponseDraft | ConsumptionResponseJSON
    ): Promise<ConsumptionResponseDraft> {
        return await super.fromT<ConsumptionResponseDraft>(value, ConsumptionResponseDraft)
    }
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
    @validate()
    public sourceType: string

    @serialize()
    @validate()
    public sourceReference: CoreId

    @serialize({ unionTypes: [ConsumptionResponse, ConsumptionResponseDraft] })
    @validate({ nullable: true })
    public response?: ConsumptionResponse | ConsumptionResponseDraft

    @serialize()
    @validate()
    public status: ConsumptionRequestStatus

    @serialize()
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

    public static async from(value: IConsumptionRequest | ConsumptionRequestJSON): Promise<ConsumptionRequest> {
        return await super.fromT<ConsumptionRequest>(value, ConsumptionRequest)
    }
}

@type("ConsumptionRequestStatusLogEntry")
export class ConsumptionRequestStatusLogEntry extends CoreSerializable implements IConsumptionRequestStatusLogEntry {
    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate({ nullable: true })
    public oldStatus: ConsumptionRequestStatus

    @serialize()
    @validate()
    public newStatus: ConsumptionRequestStatus

    @serialize()
    @validate({ nullable: true })
    public data?: object

    @serialize()
    @validate({ nullable: true })
    public code?: string

    public static from(
        value: IConsumptionRequestStatusLogEntry | ConsumptionRequestStatusLogEntryJSON
    ): ConsumptionRequestStatusLogEntry {
        return super.fromT<ConsumptionRequestStatusLogEntry>(value, ConsumptionRequestStatusLogEntry)
    }
}
