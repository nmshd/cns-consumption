import { Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId } from "@nmshd/transport"
import { DecideRequestItemGroupParametersJSON } from "./DecideRequestItemGroupParameters"
import { DecideRequestItemParametersJSON } from "./DecideRequestItemParameters"

export interface InternalDecideRequestParametersJSON {
    requestId: string
    items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
    decision: RequestDecision
}

@type("InternalDecideRequestParameters")
export class InternalDecideRequestParameters extends Serializable {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate()
    public items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]

    @serialize()
    @validate()
    public decision: RequestDecision

    public static from(value: InternalDecideRequestParametersJSON): InternalDecideRequestParameters {
        return this.fromAny(value)
    }
}

export enum RequestDecision {
    Accept = "Accept",
    Reject = "Reject"
}
