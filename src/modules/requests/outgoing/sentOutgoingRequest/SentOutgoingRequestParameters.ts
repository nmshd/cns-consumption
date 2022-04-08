import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId, IMessage, IRelationshipTemplate, Message, RelationshipTemplate } from "@nmshd/transport"

export interface ISentOutgoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    sourceObject: IMessage | IRelationshipTemplate
}

@type("SentOutgoingRequestParameters")
export class SentOutgoingRequestParameters extends SerializableAsync implements ISentOutgoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize({ unionTypes: [Message, RelationshipTemplate] })
    @validate()
    public sourceObject: Message | RelationshipTemplate

    public static override async from(value: ISentOutgoingRequestParameters): Promise<SentOutgoingRequestParameters> {
        return await super.fromT(value, SentOutgoingRequestParameters)
    }
}
