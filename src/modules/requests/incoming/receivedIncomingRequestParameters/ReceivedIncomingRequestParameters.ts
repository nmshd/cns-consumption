import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { IRequest, Request } from "@nmshd/content"
import { IMessage, IRelationshipTemplate, Message, RelationshipTemplate } from "@nmshd/transport"

export interface IReceivedIncomingRequestParameters extends ISerializableAsync {
    // id?: CoreId
    content: IRequest
    sourceObject: IMessage | IRelationshipTemplate
}

@type("ReceivedIncomingRequestParameters")
export class ReceivedIncomingRequestParameters extends SerializableAsync implements IReceivedIncomingRequestParameters {
    @serialize()
    @validate()
    public content: Request

    @serialize({ unionTypes: [Message, RelationshipTemplate] })
    @validate()
    public sourceObject: Message | RelationshipTemplate

    public static override async from(
        params: IReceivedIncomingRequestParameters
    ): Promise<ReceivedIncomingRequestParameters> {
        return await super.fromT(params, ReceivedIncomingRequestParameters)
    }
}
