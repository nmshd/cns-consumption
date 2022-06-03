import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"

export interface CreateConsumptionAttributeParamsJSON {
    content: IdentityAttributeJSON | RelationshipAttributeJSON
}

export interface ICreateConsumptionAttributeParams extends ISerializable {
    content: IIdentityAttribute | IRelationshipAttribute
}

export class CreateConsumptionAttributeParams extends Serializable implements ICreateConsumptionAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute

    public static from(
        value: ICreateConsumptionAttributeParams | CreateConsumptionAttributeParamsJSON
    ): CreateConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
