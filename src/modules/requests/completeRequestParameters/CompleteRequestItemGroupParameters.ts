import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { CompleteRequestItemParameters, ICompleteRequestItemParameters } from "./CompleteRequestItemParameters"

export interface ICompleteRequestItemGroupParameters extends ISerializable {
    items: ICompleteRequestItemParameters[]
}

@type("CompleteRequestItemGroupParameters")
export class CompleteRequestItemGroupParameters extends Serializable implements ICompleteRequestItemGroupParameters {
    @serialize()
    @validate()
    public items: CompleteRequestItemParameters[]

    public static from(params: ICompleteRequestItemGroupParameters): CompleteRequestItemGroupParameters {
        return super.fromT(params, CompleteRequestItemGroupParameters)
    }
}
