import { type } from "@js-soft/ts-serval"
import { CompleteRequestParameters, ICompleteRequestParameters } from "./CompleteRequestParameters"

export interface IRejectRequestParameters extends ICompleteRequestParameters {}

@type("RejectRequestParameters")
export class RejectRequestParameters extends CompleteRequestParameters implements IRejectRequestParameters {
    public static from(params: IRejectRequestParameters): RejectRequestParameters {
        return super.fromT(params, RejectRequestParameters)
    }
}
