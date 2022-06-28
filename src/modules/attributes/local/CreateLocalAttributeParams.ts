import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"

export interface CreateLocalAttributeParamsJSON {
    content: IdentityAttributeJSON | RelationshipAttributeJSON
}

export interface ICreateLocalAttributeParams extends ISerializable {
    content: IIdentityAttribute | IRelationshipAttribute
}

export class CreateLocalAttributeParams extends Serializable implements ICreateLocalAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute

    public static from(
        value: ICreateLocalAttributeParams | CreateLocalAttributeParamsJSON
    ): CreateLocalAttributeParams {
        return this.fromAny(value)
    }
}
