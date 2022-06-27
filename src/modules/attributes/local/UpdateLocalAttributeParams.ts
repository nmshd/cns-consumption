import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"
import { CoreId, ICoreId } from "@nmshd/transport"

export interface UpdateLocalAttributeParamsJSON extends ISerializable {
    id: string
    content: IdentityAttributeJSON | RelationshipAttributeJSON
}

export interface IUpdateLocalAttributeParams extends ISerializable {
    id: ICoreId
    content: IIdentityAttribute | IRelationshipAttribute
}

export class UpdateLocalAttributeParams extends Serializable implements IUpdateLocalAttributeParams {
    @serialize()
    @validate()
    public id: CoreId

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute

    public static from(
        value: IUpdateLocalAttributeParams | UpdateLocalAttributeParamsJSON
    ): UpdateLocalAttributeParams {
        return this.fromAny(value)
    }
}
