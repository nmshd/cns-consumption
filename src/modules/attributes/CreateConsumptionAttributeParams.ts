import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IdentityAttribute, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content"
import { CoreId, ICoreId } from "@nmshd/transport"
import { ConsumptionAttributeShareInfo, IConsumptionAttributeShareInfo } from "./local/ConsumptionAttributeShareInfo"

export interface ICreateConsumptionAttributeParams extends ISerializable {
    attribute: IIdentityAttribute | IRelationshipAttribute
    succeeds?: ICoreId
    shareInfo?: IConsumptionAttributeShareInfo
}

export class CreateConsumptionAttributeParams extends Serializable implements ICreateConsumptionAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public attribute: IdentityAttribute | RelationshipAttribute

    @serialize()
    @validate({ nullable: true })
    public succeeds?: CoreId

    @serialize()
    @validate({ nullable: true })
    public shareInfo?: ConsumptionAttributeShareInfo

    public static from(value: ICreateConsumptionAttributeParams): CreateConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
