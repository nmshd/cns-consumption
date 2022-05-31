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

export interface SucceedConsumptionAttributeParamsJSON {
    successorContent: IdentityAttributeJSON | RelationshipAttributeJSON
    succeeds: string
}

export interface ISucceedConsumptionAttributeParams extends ISerializable {
    successorContent: IIdentityAttribute | IRelationshipAttribute
    succeeds: ICoreId
}

export class SucceedConsumptionAttributeParams extends Serializable implements ISucceedConsumptionAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public successorContent: IdentityAttribute | RelationshipAttribute

    @serialize()
    @validate()
    public succeeds: CoreId

    public static from(
        value: ISucceedConsumptionAttributeParams | SucceedConsumptionAttributeParamsJSON
    ): SucceedConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
