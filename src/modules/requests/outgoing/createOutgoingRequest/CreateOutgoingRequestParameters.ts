import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { IRequest, Request } from "@nmshd/content"
import { CoreAddress, ICoreAddress } from "@nmshd/transport"

export type IRequestWithoutId = Omit<IRequest, "id">

export interface ICreateOutgoingRequestParameters extends ISerializable {
    content: IRequestWithoutId
    peer: ICoreAddress
}

@type("CreateOutgoingRequestParameters")
export class CreateOutgoingRequestParameters extends Serializable implements ICreateOutgoingRequestParameters {
    @serialize()
    @validate()
    public content: Request

    @serialize()
    @validate()
    public peer: CoreAddress

    public static from(value: ICreateOutgoingRequestParameters): CreateOutgoingRequestParameters {
        return this.fromAny(value)
    }
}
