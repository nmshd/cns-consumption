import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content"
import { CoreAddress, CoreId, ICoreAddress, ICoreId } from "@nmshd/transport"

export interface ICreateRelationshipAttributeParams extends ISerializable {
    content: IRelationshipAttribute
    peer: ICoreAddress
    requestReference: ICoreId
}

@type("CreateRelationshipAttributeParams")
export class CreateRelationshipAttributeParams extends Serializable implements ICreateRelationshipAttributeParams {
    @serialize()
    @validate()
    public content: RelationshipAttribute

    @serialize()
    @validate()
    public peer: CoreAddress

    @serialize()
    @validate()
    public requestReference: CoreId

    public static from(value: ICreateRelationshipAttributeParams): CreateRelationshipAttributeParams {
        return this.fromAny(value)
    }
}
