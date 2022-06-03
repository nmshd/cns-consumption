import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IRelationshipAttributeQuery, RelationshipAttributeQuery, RelationshipAttributeQueryJSON } from "@nmshd/content"

export interface GetRelationshipAttributesParamsJSON {
    query: RelationshipAttributeQueryJSON
}

export interface IGetRelationshipAttributesParams extends ISerializable {
    query: IRelationshipAttributeQuery
}

export class GetRelationshipAttributesParams extends Serializable implements IGetRelationshipAttributesParams {
    @serialize()
    @validate()
    public query: RelationshipAttributeQuery

    public static from(
        value: IGetRelationshipAttributesParams | GetRelationshipAttributesParamsJSON
    ): GetRelationshipAttributesParams {
        return this.fromAny(value)
    }
}
