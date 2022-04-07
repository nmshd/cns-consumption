import { type } from "@js-soft/ts-serval"
import { DecideRequestParameters, IDecideRequestParameters } from "./DecideRequestParameters"

export interface IAcceptRequestParameters extends IDecideRequestParameters {}

@type("AcceptRequestParameters")
export class AcceptRequestParameters extends DecideRequestParameters implements IAcceptRequestParameters {
    public static override from(params: IAcceptRequestParameters): AcceptRequestParameters {
        return super.fromT(params, AcceptRequestParameters)
    }
}
