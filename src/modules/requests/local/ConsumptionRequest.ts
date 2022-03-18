import { serialize, type, validate } from "@js-soft/ts-serval"
import { ContentJSON, IRequest, IResponse, Request, RequestJSON, Response, ResponseJSON } from "@nmshd/content"
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

export enum ConsumptionRequestStatus {
    Open = "Open",
    Checked = "Checked",
    DecisionRequired = "DecisionRequired",
    ManualDecisionRequired = "ManualDecisionRequired",
    Error = "Error",
    Resolved = "Resolved"
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
    sourceType?: string
    sourceReference?: string
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
    response?: IConsumptionResponse
    status: ConsumptionRequestStatus
    statusLog: IConsumptionRequestStatusLogEntry[]
}

export interface IConsumptionResponse extends ICoreSerializableAsync {
    createdAt: ICoreDate
    content: IResponse
    sourceType: string
    sourceReference: ICoreId
}

export interface IConsumptionRequestStatusLogEntry extends ICoreSerializableAsync {
    createdAt: ICoreDate
    oldStatus: ConsumptionRequestStatus
    newStatus: ConsumptionRequestStatus
    data: object
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

    @serialize({})
    @validate({ nullable: true })
    public response?: ConsumptionResponse

    @serialize()
    @validate()
    public status: ConsumptionRequestStatus

    @serialize()
    @validate()
    public statusLog: ConsumptionRequestStatusLogEntry[]

    public static async from(value: IConsumptionRequest | ConsumptionRequestJSON): Promise<ConsumptionRequest> {
        return await super.fromT<ConsumptionRequest>(value, ConsumptionRequest)
    }
}

@type("ConsumptionRequestStatusLogEntry")
export class ConsumptionRequestStatusLogEntry
    extends CoreSerializableAsync
    implements IConsumptionRequestStatusLogEntry
{
    @serialize()
    @validate()
    public createdAt: CoreDate

    @serialize()
    @validate()
    public oldStatus: ConsumptionRequestStatus

    @serialize()
    @validate()
    public newStatus: ConsumptionRequestStatus

    @serialize()
    @validate({ nullable: true })
    public data: object

    @serialize()
    @validate({ nullable: true })
    public code?: string
}
