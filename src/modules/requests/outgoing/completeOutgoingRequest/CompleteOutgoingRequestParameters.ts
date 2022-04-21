import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport"

export interface ICompleteOugoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    responseSourceObject: IMessage
    receivedResponse: IResponse
}

export class CompleteOugoingRequestParameters extends SerializableAsync implements ICompleteOugoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate()
    public receivedResponse: Response

    @serialize()
    @validate()
    public responseSourceObject: Message

    public static override async from(
        value: ICompleteOugoingRequestParameters
    ): Promise<CompleteOugoingRequestParameters> {
        return await super.fromT(value, CompleteOugoingRequestParameters)
    }
}
