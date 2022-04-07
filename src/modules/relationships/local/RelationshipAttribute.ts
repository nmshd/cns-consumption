import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { Attribute, IAttribute } from "@nmshd/content"
import { CoreId, ICoreId } from "@nmshd/transport"

export interface IRelationshipAttribute extends ISerializableAsync {
    name: string
    content: IAttribute
    sharedItem: ICoreId
}

@type("RelationshipAttribute")
export class RelationshipAttribute extends SerializableAsync implements IRelationshipAttribute {
    @validate()
    @serialize()
    public name: string

    @validate()
    @serialize()
    public content: Attribute

    @validate()
    @serialize()
    public sharedItem: CoreId

    public static override async from(value: IRelationshipAttribute): Promise<RelationshipAttribute> {
        return await super.fromT(value, RelationshipAttribute)
    }
}
