import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreDate, CoreSynchronizable, ICoreDate, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"

export interface IDraft extends ICoreSynchronizable {
    type: string
    createdAt: ICoreDate
    lastModifiedAt: ICoreDate
    content: ISerializableAsync
    metadata?: any
    metadataModifiedAt?: ICoreDate
}

@type("Draft")
export class Draft extends CoreSynchronizable implements IDraft {
    public readonly technicalProperties = [
        "@type",
        "@context",
        nameof<Draft>((r) => r.type),
        nameof<Draft>((r) => r.createdAt),
        nameof<Draft>((r) => r.lastModifiedAt)
    ]

    public readonly userdataProperties = [nameof<Draft>((r) => r.content)]

    public readonly metadataProperties = [nameof<Draft>((r) => r.metadata), nameof<Draft>((r) => r.metadataModifiedAt)]

    @validate()
    @serialize()
    public type: string

    @validate()
    @serialize()
    public createdAt: CoreDate

    @validate()
    @serialize()
    public lastModifiedAt: CoreDate

    @validate()
    @serialize()
    public content: SerializableAsync

    @validate({ nullable: true })
    @serialize({ any: true })
    public metadata?: any

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate

    public static async from(value: IDraft | Draft): Promise<Draft> {
        return (await super.from(value, Draft)) as Draft
    }
}
