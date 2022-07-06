import { Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId } from "@nmshd/transport"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"

export interface AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
    extends AcceptRequestItemParametersJSON {
    attributeId: string
}

@type("AcceptReadAttributeRequestItemParameters")
export class AcceptReadAttributeRequestItemParametersWithExistingAttribute extends Serializable {
    @serialize()
    @validate()
    public attributeId: CoreId

    public static from(
        value: AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
    ): AcceptReadAttributeRequestItemParametersWithExistingAttribute {
        return this.fromAny(value)
    }
}
