import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { DecideRequestItemParameters, IDecideRequestItemParameters } from "./DecideRequestItemParameters"

export interface IDecideRequestItemGroupParameters extends ISerializable {
    items: IDecideRequestItemParameters[]
}

@type("DecideRequestItemGroupParameters")
export class DecideRequestItemGroupParameters extends Serializable implements IDecideRequestItemGroupParameters {
    @serialize()
    @validate()
    public items: DecideRequestItemParameters[]

    public static override from(params: IDecideRequestItemGroupParameters): DecideRequestItemGroupParameters {
        return super.fromT(params, DecideRequestItemGroupParameters)
    }
}
