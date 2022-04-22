import { ISerializable, ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreDate, CoreId, CoreSynchronizable, ICoreDate, ICoreId, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"

export enum SettingScope {
    Identity = "Identity",
    Device = "Device",
    Relationship = "Relationship"
}

export interface ISetting extends ICoreSynchronizable {
    key: string
    scope: SettingScope
    reference?: ICoreId
    value: ISerializable | ISerializableAsync
    createdAt: ICoreDate
    deletedAt?: ICoreDate
    succeedsItem?: ICoreId
    succeedsAt?: ICoreDate
    metadata?: any
    metadataModifiedAt?: ICoreDate
}

@type("Setting")
export class Setting extends CoreSynchronizable implements ISetting {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Setting>((r) => r.key),
        nameof<Setting>((r) => r.scope),
        nameof<Setting>((r) => r.reference),
        nameof<Setting>((r) => r.createdAt),
        nameof<Setting>((r) => r.deletedAt),
        nameof<Setting>((r) => r.succeedsItem),
        nameof<Setting>((r) => r.succeedsAt)
    ]

    public override readonly userdataProperties = [nameof<Setting>((r) => r.value)]

    public override readonly metadataProperties = [
        nameof<Setting>((r) => r.metadata),
        nameof<Setting>((r) => r.metadataModifiedAt)
    ]

    @validate()
    @serialize()
    public key: string

    @validate()
    @serialize()
    public scope: SettingScope

    @validate({ nullable: true })
    @serialize()
    public reference?: CoreId

    @validate()
    @serialize()
    public value: SerializableAsync

    @validate()
    @serialize()
    public createdAt: CoreDate

    @validate({ nullable: true })
    @serialize()
    public deletedAt?: CoreDate

    @validate({ nullable: true })
    @serialize()
    public succeedsItem?: CoreId

    @validate({ nullable: true })
    @serialize()
    public succeedsAt?: CoreDate

    @validate({ nullable: true })
    @serialize({ any: true })
    public metadata?: any

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate

    public static from(value: ISetting): Setting {
        return this.fromAny(value)
    }
}
