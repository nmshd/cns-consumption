import { serialize, type, validate } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    CoreSynchronizable,
    ICoreDate,
    ICoreId,
    ICoreSynchronizable
} from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionIds } from "../../../consumption"
import {
    ILocalAttributeShareInfo,
    LocalAttributeShareInfo,
    LocalAttributeShareInfoJSON
} from "./LocalAttributeShareInfo"

export interface LocalAttributeJSON {
    content: IdentityAttributeJSON | RelationshipAttributeJSON
    createdAt: string
    succeeds: string
    succeededBy: string
    shareInfo: LocalAttributeShareInfoJSON
}

export interface ILocalAttribute extends ICoreSynchronizable {
    content: IIdentityAttribute | IRelationshipAttribute
    createdAt: ICoreDate
    succeeds?: ICoreId
    succeededBy?: ICoreId
    shareInfo?: ILocalAttributeShareInfo
}

@type("LocalAttribute")
export class LocalAttribute extends CoreSynchronizable implements ILocalAttribute {
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<LocalAttribute>((r) => r.createdAt),
        nameof<LocalAttribute>((r) => r.succeeds),
        nameof<LocalAttribute>((r) => r.createdAt)
    ]

    public override readonly userdataProperties = [nameof<LocalAttribute>((r) => r.content)]

    @validate()
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    public content: IdentityAttribute | RelationshipAttribute

    @validate()
    @serialize()
    public createdAt: CoreDate

    @validate({ nullable: true })
    @serialize()
    public succeeds?: CoreId

    @validate({ nullable: true })
    @serialize()
    public succeededBy?: CoreId

    @validate({ nullable: true })
    @serialize()
    public shareInfo?: LocalAttributeShareInfo

    public isIdentityAttribute(): boolean {
        return this.content instanceof IdentityAttribute
    }

    public hasOwner(identity: CoreAddress): boolean {
        return this.content.owner.equals(identity)
    }

    public static from(value: ILocalAttribute): LocalAttribute {
        return this.fromAny(value)
    }

    public static async fromAttribute(
        attribute: IIdentityAttribute | IRelationshipAttribute,
        succeeds?: ICoreId,
        shareInfo?: ILocalAttributeShareInfo,
        id?: CoreId
    ): Promise<LocalAttribute> {
        return this.from({
            id: id ?? (await ConsumptionIds.attribute.generate()),
            content: attribute,
            createdAt: CoreDate.utc(),
            succeeds: succeeds,
            shareInfo: shareInfo
        })
    }
}
