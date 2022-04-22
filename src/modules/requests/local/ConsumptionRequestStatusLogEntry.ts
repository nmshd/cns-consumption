import { serialize, type, validate } from "@js-soft/ts-serval"
import { CoreDate, CoreSerializable, ICoreDate, ICoreSerializable } from "@nmshd/transport"
import { ConsumptionRequestStatus } from "./ConsumptionRequestStatus"

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
    @validate()
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

    public static override from(value: IConsumptionRequestStatusLogEntry): ConsumptionRequestStatusLogEntry {
        return super.fromT<ConsumptionRequestStatusLogEntry>(value, ConsumptionRequestStatusLogEntry)
    }
}
