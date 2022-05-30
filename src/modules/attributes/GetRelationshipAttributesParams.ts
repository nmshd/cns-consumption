import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IRelationshipAttributeQuery, RelationshipAttributeQuery } from "@nmshd/content"

export interface IGetRelationshipAttributesParams extends ISerializable {
    query: IRelationshipAttributeQuery
}

export class GetRelationshipAttributesParams extends Serializable implements IGetRelationshipAttributesParams {
    @serialize()
    @validate()
    public query: RelationshipAttributeQuery

    public static from(value: IGetRelationshipAttributesParams): GetRelationshipAttributesParams {
        return this.fromAny(value)
    }
}
