import { Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"

export interface AcceptReadAttributeRequestItemParametersWithNewAttributeJSON extends AcceptRequestItemParametersJSON {
    newAttributeValue: IdentityAttributeJSON | RelationshipAttributeJSON
}

@type("AcceptReadAttributeRequestItemParameters")
export class AcceptReadAttributeRequestItemParametersWithNewAttribute extends Serializable {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate({ nullable: true })
    public newAttributeValue: IdentityAttribute | RelationshipAttribute

    public static from(
        value: AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
    ): AcceptReadAttributeRequestItemParametersWithNewAttribute {
        return this.fromAny(value)
    }
}
