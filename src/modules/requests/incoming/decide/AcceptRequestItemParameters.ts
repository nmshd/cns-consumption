import { ISerializableAsync, type } from "@js-soft/ts-serval"
import { DecideRequestItemParameters } from "./DecideRequestItemParameters"

export interface IAcceptRequestItemParameters extends ISerializableAsync {}

@type("AcceptRequestItemParameters")
export class AcceptRequestItemParameters extends DecideRequestItemParameters implements IAcceptRequestItemParameters {
    public static from(value: IAcceptRequestItemParameters): AcceptRequestItemParameters {
        return this.fromAny(value)
    }
}
