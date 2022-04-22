import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId } from "@nmshd/transport"
import { DecideRequestItemGroupParameters, IDecideRequestItemGroupParameters } from "./DecideRequestItemGroupParameters"
import { DecideRequestItemParameters, IDecideRequestItemParameters } from "./DecideRequestItemParameters"

export interface IDecideRequestParameters extends ISerializable {
    requestId: ICoreId
    items: (IDecideRequestItemParameters | IDecideRequestItemGroupParameters)[]
}

export abstract class DecideRequestParameters extends Serializable implements IDecideRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate({
        customValidator: (items: (IDecideRequestItemParameters | IDecideRequestItemGroupParameters)[]) =>
            items.length === 0 ? "may not be empty" : undefined
    })
    public items: (DecideRequestItemParameters | DecideRequestItemGroupParameters)[]
}
