import { ISerializable, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { IRequest, Request } from "@nmshd/content"
import { CoreAddress, ICoreAddress } from "@nmshd/transport"

export type IRequestWithoutId = Omit<IRequest, "id">

export interface ICreateOutgoingRequestParameters extends ISerializable {
    request: IRequestWithoutId
    peer: ICoreAddress
}

@type("CreateOutgoingRequestParameters")
export class CreateOutgoingRequestParameters extends SerializableAsync implements ICreateOutgoingRequestParameters {
    @serialize()
    @validate()
    public request: Request

    @serialize()
    @validate()
    public peer: CoreAddress

    public static override async from(
        value: ICreateOutgoingRequestParameters
    ): Promise<CreateOutgoingRequestParameters> {
        return await super.fromT(value, CreateOutgoingRequestParameters)
    }
}
