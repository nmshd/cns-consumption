import { type } from "@js-soft/ts-serval"
import { CompleteRequestParameters, ICompleteRequestParameters } from "./CompleteRequestParameters"

export interface IAcceptRequestParameters extends ICompleteRequestParameters {}

@type("AcceptRequestParameters")
export class AcceptRequestParameters extends CompleteRequestParameters implements IAcceptRequestParameters {
    public static from(params: IAcceptRequestParameters): AcceptRequestParameters {
        return super.fromT(params, AcceptRequestParameters)
    }
}
