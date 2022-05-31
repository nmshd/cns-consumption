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

export interface UpdateConsumptionAttributeParamsJSON extends ISerializable {
    id: string
    content: IdentityAttributeJSON | RelationshipAttributeJSON
}

export interface IUpdateConsumptionAttributeParams extends ISerializable {
    id: ICoreId
    content: IIdentityAttribute | IRelationshipAttribute
}

export class UpdateConsumptionAttributeParams extends Serializable implements IUpdateConsumptionAttributeParams {
    @serialize()
    @validate()
    public id: CoreId

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute

    public static from(
        value: IUpdateConsumptionAttributeParams | UpdateConsumptionAttributeParamsJSON
    ): UpdateConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
