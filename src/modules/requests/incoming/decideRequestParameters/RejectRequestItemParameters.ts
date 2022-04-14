import { ISerializable, serialize, type, validate } from "@js-soft/ts-serval"
import { DecideRequestItemParameters } from "./DecideRequestItemParameters"

export interface IRejectRequestItemParameters extends ISerializable {
    code?: string
    message?: string
}

@type("RejectRequestItemParameters")
export class RejectRequestItemParameters extends DecideRequestItemParameters implements IRejectRequestItemParameters {
    @serialize()
    @validate({ nullable: true })
    public code?: string

    @serialize()
    @validate({ nullable: true })
    public message?: string

    public static override async from(params: IRejectRequestItemParameters): Promise<RejectRequestItemParameters> {
        return await super.fromT(params, RejectRequestItemParameters)
    }
}
