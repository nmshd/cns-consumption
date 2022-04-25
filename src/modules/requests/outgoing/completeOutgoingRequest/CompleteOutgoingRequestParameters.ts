import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport"

export interface ICompleteOugoingRequestParameters extends ISerializable {
    requestId: ICoreId
    responseSourceObject: IMessage
    receivedResponse: IResponse
}

@type("CompleteOugoingRequestParameters")
export class CompleteOugoingRequestParameters extends Serializable implements ICompleteOugoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate()
    public responseSourceObject: Message

    @serialize()
    @validate()
    public receivedResponse: Response

    public static from(value: ICompleteOugoingRequestParameters): CompleteOugoingRequestParameters {
        return this.fromAny(value)
    }
}
