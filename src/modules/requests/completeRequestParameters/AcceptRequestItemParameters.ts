import { ISerializable, type } from "@js-soft/ts-serval"
import { CompleteRequestItemParameters } from "./CompleteRequestItemParameters"

export interface IAcceptRequestItemParameters extends ISerializable {}

@type("AcceptRequestItemParameters")
export class AcceptRequestItemParameters extends CompleteRequestItemParameters implements IAcceptRequestItemParameters {
    public static from(params: IAcceptRequestItemParameters): AcceptRequestItemParameters {
        return super.fromT(params, AcceptRequestItemParameters)
    }
}
