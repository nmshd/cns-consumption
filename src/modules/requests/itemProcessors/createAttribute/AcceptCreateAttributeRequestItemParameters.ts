import { Serializable, type } from "@js-soft/ts-serval"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"

export interface AcceptCreateAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {}

@type("AcceptCreateAttributeRequestItemParameters")
export class AcceptCreateAttributeRequestItemParameters extends Serializable {
    public static from(
        value: AcceptCreateAttributeRequestItemParametersJSON
    ): AcceptCreateAttributeRequestItemParameters {
        return this.fromAny(value)
    }
}
