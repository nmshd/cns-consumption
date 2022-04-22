import { type } from "@js-soft/ts-serval"
import { DecideRequestParameters, IDecideRequestParameters } from "./DecideRequestParameters"

export interface IAcceptRequestParameters extends IDecideRequestParameters {}

@type("AcceptRequestParameters")
export class AcceptRequestParameters extends DecideRequestParameters implements IAcceptRequestParameters {
    public static override async from(params: IAcceptRequestParameters): Promise<AcceptRequestParameters> {
        return await super.fromT(params, AcceptRequestParameters)
    }
}
