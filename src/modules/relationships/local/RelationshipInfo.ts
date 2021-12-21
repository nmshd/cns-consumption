import { serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId, CoreSynchronizable, ICoreId, ICoreSynchronizable, Relationship } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionIds } from "../../../consumption"
import { IRelationshipAttribute, RelationshipAttribute } from "./RelationshipAttribute"
import { IRelationshipTheme, RelationshipTheme } from "./RelationshipTheme"

export interface IRelationshipInfo extends ICoreSynchronizable {
    relationshipId: ICoreId
    attributes: IRelationshipAttribute[]
    isPinned: boolean
    title: string
    description?: string
    userTitle?: string
    userDescription?: string
    theme?: IRelationshipTheme
}

@type("RelationshipInfo")
export class RelationshipInfo extends CoreSynchronizable implements IRelationshipInfo {
    public readonly technicalProperties = [
        "@type",
        "@context",
        nameof<RelationshipInfo>((r) => r.relationshipId),
        nameof<RelationshipInfo>((r) => r.title),
        nameof<RelationshipInfo>((r) => r.description),
        nameof<RelationshipInfo>((r) => r.theme)
    ]

    public readonly userdataProperties = [
        nameof<RelationshipInfo>((r) => r.isPinned),
        nameof<RelationshipInfo>((r) => r.userTitle),
        nameof<RelationshipInfo>((r) => r.userDescription)
    ]

    @validate()
    @serialize()
    public relationshipId: CoreId

    @validate()
    @serialize({ type: RelationshipAttribute })
    public attributes: RelationshipAttribute[]

    @validate()
    @serialize()
    public isPinned: boolean

    @validate({ nullable: true })
    @serialize()
    public userTitle?: string

    @validate()
    @serialize()
    public title: string

    @validate({ nullable: true })
    @serialize()
    public userDescription?: string

    @validate({ nullable: true })
    @serialize()
    public description?: string

    @validate({ nullable: true })
    @serialize()
    public theme?: RelationshipTheme

    public static async fromRelationship(relationship: Relationship): Promise<RelationshipInfo> {
        if (typeof relationship.metadata === "undefined") {
            return await RelationshipInfo.from({
                id: await ConsumptionIds.relationshipInfo.generate(),
                relationshipId: relationship.id,
                attributes: [],
                isPinned: false,
                title: relationship.peer.address.address.substring(3, 9)
            })
        }
        return await RelationshipInfo.from(relationship.metadata)
    }

    public static async from(value: IRelationshipInfo): Promise<RelationshipInfo> {
        return await super.fromT(value, RelationshipInfo)
    }
}
