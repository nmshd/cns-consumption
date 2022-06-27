import { serialize, type, validate } from "@js-soft/ts-serval"
import { IRequest, Request } from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    CoreSerializable,
    CoreSynchronizable,
    ICoreAddress,
    ICoreDate,
    ICoreId,
    ICoreSerializable,
    ICoreSynchronizable
} from "@nmshd/transport"
import { LocalRequestStatus } from "./LocalRequestStatus"
import { ILocalRequestStatusLogEntry, LocalRequestStatusLogEntry } from "./LocalRequestStatusLogEntry"
import { ConsumptionResponse, IConsumptionResponse } from "./LocalResponse"

export interface ILocalRequestSource extends ICoreSerializable {
    type: "Message" | "RelationshipTemplate"
    reference: ICoreId
}

@type("LocalRequestSource")
export class LocalRequestSource extends CoreSerializable implements ILocalRequestSource {
    @serialize()
    @validate()
    public type: "Message" | "RelationshipTemplate"

    @serialize()
    @validate()
    public reference: CoreId

    public static from(value: ILocalRequestSource): LocalRequestSource {
        return this.fromAny(value)
    }
}

export interface ILocalRequest extends ICoreSynchronizable {
    isOwn: boolean
    peer: ICoreAddress
    createdAt: ICoreDate
    content: IRequest
    source?: ILocalRequestSource
    response?: IConsumptionResponse
    status: LocalRequestStatus
    statusLog: ILocalRequestStatusLogEntry[]
}

@type("LocalRequest")
export class LocalRequest extends CoreSynchronizable implements ILocalRequest {
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
    public source?: LocalRequestSource

    @serialize()
    @validate({ nullable: true })
    public response?: ConsumptionResponse

    @serialize()
    @validate()
    public status: LocalRequestStatus

    @serialize({ type: LocalRequestStatusLogEntry })
    @validate()
    public statusLog: LocalRequestStatusLogEntry[]

    public changeStatus(newStatus: LocalRequestStatus): void {
        const logEntry = LocalRequestStatusLogEntry.from({
            createdAt: CoreDate.utc(),
            oldStatus: this.status,
            newStatus
        })

        this.statusLog.push(logEntry)

        this.status = newStatus
    }

    public sent(source: LocalRequestSource): void {
        if (this.status !== LocalRequestStatus.Draft) {
            throw new Error("Consumption Request has to be in status 'Draft'.")
        }

        this.source = source
        this.changeStatus(LocalRequestStatus.Open)
    }

    public static from(value: ILocalRequest): LocalRequest {
        return this.fromAny(value)
    }
}
