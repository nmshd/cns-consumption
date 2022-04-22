import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId, IMessage, Message } from "@nmshd/transport"

export interface ISentOutgoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    requestSourceObject: IMessage
}

@type("SentOutgoingRequestParameters")
export class SentOutgoingRequestParameters extends SerializableAsync implements ISentOutgoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize()
    @validate()
    public requestSourceObject: Message

    public static override async from(value: ISentOutgoingRequestParameters): Promise<SentOutgoingRequestParameters> {
        return await super.fromT(value, SentOutgoingRequestParameters)
    }
}
