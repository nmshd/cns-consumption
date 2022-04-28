import { DecideRequestItemParametersJSON } from "./DecideRequestItemParameters"

export interface DecideRequestItemGroupParametersJSON extends Record<string, unknown> {
    items: DecideRequestItemParametersJSON[]
}
