import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"

export interface IRelationshipTheme extends ISerializableAsync {
    image: string
    imageBar: string
    backgroundColor: string
    foregroundColor: string
}

@type("RelationshipTheme")
export class RelationshipTheme extends SerializableAsync implements IRelationshipTheme {
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

    public static override async from(value: IRelationshipTheme): Promise<RelationshipTheme> {
        return await super.fromT(value, RelationshipTheme)
    }
}
