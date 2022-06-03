import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttribute,
    IRelationshipAttribute,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/transport"

export interface CreatePeerConsumptionAttributeParamsJSON {
    id: string
    content: IdentityAttributeJSON | RelationshipAttributeJSON
    requestReferece: string
    peer: string
}

export interface ICreatePeerConsumptionAttributeParams extends ISerializable {
    id: ICoreId
    content: IIdentityAttribute | IRelationshipAttribute
    requestReference: ICoreId
    peer: ICoreAddress
}

export class CreatePeerConsumptionAttributeParams
    extends Serializable
    implements ICreatePeerConsumptionAttributeParams
{
    @serialize()
    @validate()
    public id: CoreId

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public content: IdentityAttribute | RelationshipAttribute

    @serialize()
    @validate()
    public requestReference: CoreId

    @serialize()
    @validate()
    public peer: CoreAddress

    public static from(
        value: ICreatePeerConsumptionAttributeParams | CreatePeerConsumptionAttributeParamsJSON
    ): CreatePeerConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
