import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IdentityAttributeQuery, IdentityAttributeQueryJSON, IIdentityAttributeQuery } from "@nmshd/content"

export interface GetIdentityAttributesParamsJSON {
    query: IdentityAttributeQueryJSON
}

export interface IGetIdentityAttributesParams extends ISerializable {
    query: IIdentityAttributeQuery
}

export class GetIdentityAttributesParams extends Serializable implements IGetIdentityAttributesParams {
    @serialize()
    @validate()
    public query: IdentityAttributeQuery

    public static from(
        value: IGetIdentityAttributesParams | GetIdentityAttributesParamsJSON
    ): GetIdentityAttributesParams {
        return this.fromAny(value)
    }
}
