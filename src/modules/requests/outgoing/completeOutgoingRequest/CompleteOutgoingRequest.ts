import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport"

export interface ICompleteOugoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    sourceObject: IMessage
    response: IResponse
}

export class CompleteOugoingRequestParameters extends SerializableAsync implements ICompleteOugoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate()
    public sourceObject: Message

    @serialize()
    @validate()
    public response: Response

    public static override async from(
        value: ICompleteOugoingRequestParameters
    ): Promise<CompleteOugoingRequestParameters> {
        return await super.fromT(value, CompleteOugoingRequestParameters)
    }
}
