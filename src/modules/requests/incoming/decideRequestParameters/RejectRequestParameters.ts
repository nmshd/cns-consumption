import { type } from "@js-soft/ts-serval"
import { DecideRequestParameters, IDecideRequestParameters } from "./DecideRequestParameters"

export interface IRejectRequestParameters extends IDecideRequestParameters {}

@type("RejectRequestParameters")
export class RejectRequestParameters extends DecideRequestParameters implements IRejectRequestParameters {
    public static override async from(params: IRejectRequestParameters): Promise<RejectRequestParameters> {
        return await super.fromT(params, RejectRequestParameters)
    }
}
