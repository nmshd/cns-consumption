import { Serializable, serialize, validate } from "@js-soft/ts-serval"
import { CoreId } from "@nmshd/transport"
import {
    CompleteRequestItemGroupParameters,
    ICompleteRequestItemGroupParameters
} from "./CompleteRequestItemGroupParameters"
import { CompleteRequestItemParameters, ICompleteRequestItemParameters } from "./CompleteRequestItemParameters"

export interface ICompleteRequestParameters {
    requestId: CoreId
    items: (ICompleteRequestItemParameters | ICompleteRequestItemGroupParameters)[]
}

export abstract class CompleteRequestParameters extends Serializable implements ICompleteRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate({
        customValidator: (items: (ICompleteRequestItemParameters | ICompleteRequestItemGroupParameters)[]) =>
            items.length === 0 ? "may not be empty" : undefined
    })
    public items: (CompleteRequestItemParameters | CompleteRequestItemGroupParameters)[]
}