import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IdentityAttributeQuery, IIdentityAttributeQuery } from "@nmshd/content"

export interface IGetIdentityAttributesParams extends ISerializable {
    query: IIdentityAttributeQuery
}

export class GetIdentityAttributesParams extends Serializable implements IGetIdentityAttributesParams {
    @serialize()
    @validate()
    public query: IdentityAttributeQuery

    public static from(value: IGetIdentityAttributesParams): GetIdentityAttributesParams {
        return this.fromAny(value)
    }
}
