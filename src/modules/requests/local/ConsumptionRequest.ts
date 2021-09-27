import { serialize, type, validate } from "@js-soft/ts-serval"
import { CoreDate, CoreId, CoreSynchronizable, ICoreDate, ICoreId, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"

export interface IConsumptionRequest extends ICoreSynchronizable {
    isOwn: boolean
    requestMessage: ICoreId
    responseMessage?: ICoreId
    isPending: boolean
    status: ConsumptionRequestStatus
    processingMetadata?: any
    metadata?: any
    metadataModifiedAt?: ICoreDate
}

export enum ConsumptionRequestStatus {
    Pending = "Pending",
    Accepted = "Accepted",
    Rejected = "Rejected",
    Revoked = "Revoked"
}

@type("ConsumptionRequest")
export class ConsumptionRequest extends CoreSynchronizable implements IConsumptionRequest {
    public readonly technicalProperties = [
        "@type",
        "@context",
        nameof<ConsumptionRequest>((r) => r.isOwn),
        nameof<ConsumptionRequest>((r) => r.requestMessage),
        nameof<ConsumptionRequest>((r) => r.responseMessage),
        nameof<ConsumptionRequest>((r) => r.isPending),
        nameof<ConsumptionRequest>((r) => r.status)
    ]

    public readonly metadataProperties = [
        nameof<ConsumptionRequest>((r) => r.processingMetadata),
        nameof<ConsumptionRequest>((r) => r.metadata),
        nameof<ConsumptionRequest>((r) => r.metadataModifiedAt)
    ]

    @validate()
    @serialize()
    public isOwn: boolean

    @validate()
    @serialize()
    public requestMessage: CoreId

    @validate({ nullable: true })
    @serialize()
    public responseMessage?: CoreId

    @validate()
    @serialize()
    public isPending: boolean

    @validate({
        allowedValues: [
            ConsumptionRequestStatus.Pending,
            ConsumptionRequestStatus.Accepted,
            ConsumptionRequestStatus.Rejected,
            ConsumptionRequestStatus.Revoked
        ]
    })
    @serialize()
    public status: ConsumptionRequestStatus

    @validate({ nullable: true })
    @serialize({ any: true })
    public processingMetadata?: any

    @validate({ nullable: true })
    @serialize({ any: true })
    public metadata?: any

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate

    public static async from(value: IConsumptionRequest): Promise<ConsumptionRequest> {
        return (await super.from(value, ConsumptionRequest)) as ConsumptionRequest
    }
}
