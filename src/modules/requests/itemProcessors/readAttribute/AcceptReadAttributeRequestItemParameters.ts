import { Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId } from "@nmshd/transport"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"

export interface AcceptReadAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    attributeId: string
}

@type("AcceptReadAttributeRequestItemParameters")
export class AcceptReadAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate()
    public attributeId: CoreId

    public static from(value: AcceptReadAttributeRequestItemParametersJSON): AcceptReadAttributeRequestItemParameters {
        return this.fromAny(value)
    }
}
