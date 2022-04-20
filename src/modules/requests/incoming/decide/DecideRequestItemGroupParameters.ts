import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { DecideRequestItemParameters, IDecideRequestItemParameters } from "./DecideRequestItemParameters"

export interface IDecideRequestItemGroupParameters extends ISerializableAsync {
    items: IDecideRequestItemParameters[]
}

@type("DecideRequestItemGroupParameters")
export class DecideRequestItemGroupParameters extends SerializableAsync implements IDecideRequestItemGroupParameters {
    @serialize()
    @validate()
    public items: DecideRequestItemParameters[]

    public static override async from(
        params: IDecideRequestItemGroupParameters
    ): Promise<DecideRequestItemGroupParameters> {
        return await super.fromT(params, DecideRequestItemGroupParameters)
    }
}
