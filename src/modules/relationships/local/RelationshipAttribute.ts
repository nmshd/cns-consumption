import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { Attribute, IAttribute } from "@nmshd/content"
import { CoreId, ICoreId } from "@nmshd/transport"

export interface IRelationshipAttribute extends ISerializable {
    name: string
    content: IAttribute
    sharedItem: ICoreId
}

@type("RelationshipAttribute")
export class RelationshipAttribute extends Serializable implements IRelationshipAttribute {
    @validate()
    @serialize()
    public name: string

    @validate()
    @serialize()
    public content: Attribute

    @validate()
    @serialize()
    public sharedItem: CoreId

    public static from(value: IRelationshipAttribute): RelationshipAttribute {
        return this.fromAny(value)
    }
}
