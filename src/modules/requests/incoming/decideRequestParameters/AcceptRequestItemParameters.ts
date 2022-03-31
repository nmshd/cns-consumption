import { ISerializable, type } from "@js-soft/ts-serval"
import { DecideRequestItemParameters } from "./DecideRequestItemParameters"

export interface IAcceptRequestItemParameters extends ISerializable {}

@type("AcceptRequestItemParameters")
export class AcceptRequestItemParameters extends DecideRequestItemParameters implements IAcceptRequestItemParameters {
    public static from(params: IAcceptRequestItemParameters): AcceptRequestItemParameters {
        return super.fromT(params, AcceptRequestItemParameters)
    }
}
