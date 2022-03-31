import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { Request } from "@nmshd/content"
import { IMessage, IRelationshipTemplate, Message, RelationshipTemplate } from "@nmshd/transport"

export interface IReceivedIncomingRequestParameters extends ISerializable {
    // id?: CoreId
    content: Request
    source: IMessage | IRelationshipTemplate
}

export class ReceivedIncomingRequestParameters extends Serializable implements IReceivedIncomingRequestParameters {
    @serialize()
    @validate()
    public content: Request

    @serialize()
    @validate()
    public source: Message | RelationshipTemplate

    public static from(params: IReceivedIncomingRequestParameters): ReceivedIncomingRequestParameters {
        return super.fromT(params, ReceivedIncomingRequestParameters)
    }
}
