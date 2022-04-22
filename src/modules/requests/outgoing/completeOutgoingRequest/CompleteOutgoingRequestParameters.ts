import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport"

export interface ICompleteOugoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    responseSourceObject: IMessage
    receivedResponse: IResponse
}

@type("CompleteOugoingRequestParameters")
export class CompleteOugoingRequestParameters extends SerializableAsync implements ICompleteOugoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate()
    public responseSourceObject: Message

    @serialize()
    @validate()
    public receivedResponse: Response

    public static override async from(
        value: ICompleteOugoingRequestParameters
    ): Promise<CompleteOugoingRequestParameters> {
        return await super.fromT(value, CompleteOugoingRequestParameters)
    }
}
