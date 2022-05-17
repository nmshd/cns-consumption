import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IdentityAttribute, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content"

export interface ICreateConsumptionAttributeParams extends ISerializable {
    content: IIdentityAttribute | IRelationshipAttribute
}

export class CreateConsumptionAttributeParams extends Serializable implements ICreateConsumptionAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute

    public static from(value: ICreateConsumptionAttributeParams): CreateConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
