import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"

export interface IRelationshipTheme extends ISerializable {
    image: string
    imageBar: string
    backgroundColor: string
    foregroundColor: string
}

@type("RelationshipTheme")
export class RelationshipTheme extends Serializable implements IRelationshipTheme {
    @validate()
    @serialize()
    public image: string

    @validate()
    @serialize()
    public imageBar: string

    @validate()
    @serialize()
    public backgroundColor: string

    @validate()
    @serialize()
    public foregroundColor: string

    public static from(value: IRelationshipTheme): RelationshipTheme {
        return this.fromAny(value)
    }
}
