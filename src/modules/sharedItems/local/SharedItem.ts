import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    CoreSynchronizable,
    ICoreAddress,
    ICoreDate,
    ICoreId,
    ICoreSynchronizable
} from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"

export interface ISharedItem extends ICoreSynchronizable {
    tags?: string[]
    sharedBy: ICoreAddress
    sharedWith: ICoreAddress
    sharedAt: ICoreDate
    reference?: ICoreId
    content: ISerializable
    succeedsItem?: ICoreId
    succeedsAt?: ICoreDate
    expiresAt?: ICoreDate
    metadata?: any
    metadataModifiedAt?: ICoreDate
}

@type("SharedItem")
export class SharedItem extends CoreSynchronizable implements ISharedItem {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<SharedItem>((r) => r.tags),
        nameof<SharedItem>((r) => r.sharedBy),
        nameof<SharedItem>((r) => r.sharedWith),
        nameof<SharedItem>((r) => r.sharedAt),
        nameof<SharedItem>((r) => r.reference),
        nameof<SharedItem>((r) => r.content),
        nameof<SharedItem>((r) => r.succeedsItem),
        nameof<SharedItem>((r) => r.succeedsAt),
        nameof<SharedItem>((r) => r.expiresAt)
    ]

    public override readonly metadataProperties = [
        nameof<SharedItem>((r) => r.metadata),
        nameof<SharedItem>((r) => r.metadataModifiedAt)
    ]

    @validate({ nullable: true })
    @serialize({ type: String })
    public tags?: string[]

    @validate()
    @serialize()
    public sharedBy: CoreAddress

    @validate()
    @serialize()
    public sharedWith: CoreAddress

    @validate()
    @serialize()
    public sharedAt: CoreDate

    @validate({ nullable: true })
    @serialize()
    public reference?: CoreId

    @validate()
    @serialize()
    public content: Serializable

    @validate({ nullable: true })
    @serialize()
    public succeedsItem?: CoreId

    @validate({ nullable: true })
    @serialize()
    public succeedsAt?: CoreDate

    @validate({ nullable: true })
    @serialize()
    public expiresAt?: CoreDate

    @validate({ nullable: true })
    @serialize({ any: true })
    public metadata?: any

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate

    public static from(value: ISharedItem): SharedItem {
        return this.fromAny(value)
    }
}
