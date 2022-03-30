import { serialize, type, validate } from "@js-soft/ts-serval"
import { ContentJSON } from "@nmshd/content"
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "@nmshd/transport"
import { ConsumptionRequestStatus } from "./ConsumptionRequestStatus"

export interface ConsumptionRequestStatusLogEntryJSON extends ContentJSON {
    createdAt: string
    oldStatus: ConsumptionRequestStatus
    newStatus: ConsumptionRequestStatus
    data?: object
    code?: string
}

export interface IConsumptionRequestStatusLogEntry extends ICoreSerializable {
    createdAt: ICoreDate
    oldStatus: ConsumptionRequestStatus
    newStatus: ConsumptionRequestStatus
    data?: object
    code?: string
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
