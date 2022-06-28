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

export interface SucceedLocalAttributeParamsJSON {
    successorContent: IdentityAttributeJSON | RelationshipAttributeJSON
    succeeds: string
}

export interface ISucceedLocalAttributeParams extends ISerializable {
    successorContent: IIdentityAttribute | IRelationshipAttribute
    succeeds: ICoreId
}

export class SucceedLocalAttributeParams extends Serializable implements ISucceedLocalAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public successorContent: IdentityAttribute | RelationshipAttribute

    @serialize()
    @validate()
    public succeeds: CoreId

    public static from(
        value: ISucceedLocalAttributeParams | SucceedLocalAttributeParamsJSON
    ): SucceedLocalAttributeParams {
        return this.fromAny(value)
    }
}
