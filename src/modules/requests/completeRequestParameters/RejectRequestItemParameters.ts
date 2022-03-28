import { ISerializable, serialize, type, validate } from "@js-soft/ts-serval"
import { CompleteRequestItemParameters } from "../.."

export interface IRejectRequestItemParameters extends ISerializable {
    code?: string
    message?: string
}

@type("RejectRequestItemParameters")
export class RejectRequestItemParameters extends CompleteRequestItemParameters implements IRejectRequestItemParameters {
    @serialize()
    @validate({ nullable: true })
    public code?: string

    @serialize()
    @validate({ nullable: true })
    public message?: string

    public static from(params: IRejectRequestItemParameters): RejectRequestItemParameters {
        return super.fromT(params, RejectRequestItemParameters)
    }
}
