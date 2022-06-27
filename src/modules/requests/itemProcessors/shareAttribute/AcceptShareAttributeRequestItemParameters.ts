import { Serializable, type } from "@js-soft/ts-serval"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"

export interface AcceptShareAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {}

@type("AcceptShareAttributeRequestItemParameters")
export class AcceptShareAttributeRequestItemParameters extends Serializable {
    public static from(
        value: AcceptShareAttributeRequestItemParametersJSON
    ): AcceptShareAttributeRequestItemParameters {
        return this.fromAny(value)
    }
}
