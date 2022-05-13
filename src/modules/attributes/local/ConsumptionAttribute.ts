import { serialize, type, validate } from "@js-soft/ts-serval"
import { IdentityAttribute, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content"
import { CoreDate, CoreId, CoreSynchronizable, ICoreDate, ICoreId, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionIds } from "../../../consumption"
import { ConsumptionAttributeShareInfo, IConsumptionAttributeShareInfo } from "./ConsumptionAttributeShareInfo"

export interface IConsumptionAttribute extends ICoreSynchronizable {
    content: IIdentityAttribute | IRelationshipAttribute
    createdAt: ICoreDate
    succeeds?: ICoreId
    succeededBy?: ICoreId
    shareInfo?: IConsumptionAttributeShareInfo
}

@type("ConsumptionAttribute")
export class ConsumptionAttribute extends CoreSynchronizable implements IConsumptionAttribute {
    public override technicalProperties = ["@type", "@context", nameof<ConsumptionAttribute>((r) => r.createdAt)]

    public override userdataProperties = [nameof<ConsumptionAttribute>((r) => r.content)]

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
    public shareInfo?: ConsumptionAttributeShareInfo

    public static from(value: IConsumptionAttribute): ConsumptionAttribute {
        return this.fromAny(value)
    }

    public static async fromAttribute(
        attribute: IIdentityAttribute | IRelationshipAttribute,
        succeeds?: ICoreId,
        shareInfo?: IConsumptionAttributeShareInfo
    ): Promise<ConsumptionAttribute> {
        return this.from({
            content: attribute,
            id: await ConsumptionIds.attribute.generate(),
            createdAt: CoreDate.utc(),
            succeeds: succeeds,
            shareInfo: shareInfo
        })
    }
}
