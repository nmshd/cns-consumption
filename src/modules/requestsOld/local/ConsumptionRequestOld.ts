import { serialize, type, validate } from "@js-soft/ts-serval"
import { CoreDate, CoreId, CoreSynchronizable, ICoreDate, ICoreId, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"

export interface IConsumptionRequestOld extends ICoreSynchronizable {
    isOwn: boolean
    requestMessage: ICoreId
    responseMessage?: ICoreId
    isPending: boolean
    status: ConsumptionRequestStatusOld
    processingMetadata?: any
    metadata?: any
    metadataModifiedAt?: ICoreDate
}

export enum ConsumptionRequestStatusOld {
    Pending = "Pending",
    Accepted = "Accepted",
    Rejected = "Rejected",
    Revoked = "Revoked"
}

@type("ConsumptionRequestOld")
export class ConsumptionRequestOld extends CoreSynchronizable implements IConsumptionRequestOld {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<ConsumptionRequestOld>((r) => r.isOwn),
        nameof<ConsumptionRequestOld>((r) => r.requestMessage),
        nameof<ConsumptionRequestOld>((r) => r.responseMessage),
        nameof<ConsumptionRequestOld>((r) => r.isPending),
        nameof<ConsumptionRequestOld>((r) => r.status)
    ]

    public override readonly metadataProperties = [
        nameof<ConsumptionRequestOld>((r) => r.processingMetadata),
        nameof<ConsumptionRequestOld>((r) => r.metadata),
        nameof<ConsumptionRequestOld>((r) => r.metadataModifiedAt)
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
            ConsumptionRequestStatusOld.Pending,
            ConsumptionRequestStatusOld.Accepted,
            ConsumptionRequestStatusOld.Rejected,
            ConsumptionRequestStatusOld.Revoked
        ]
    })
    @serialize()
    public status: ConsumptionRequestStatusOld

    @validate({ nullable: true })
    @serialize({ any: true })
    public processingMetadata?: any

    @validate({ nullable: true })
    @serialize({ any: true })
    public metadata?: any

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate

    public static override async from(value: IConsumptionRequestOld): Promise<ConsumptionRequestOld> {
        return (await super.from(value, ConsumptionRequestOld)) as ConsumptionRequestOld
    }
}
