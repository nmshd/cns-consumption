import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { Request } from "@nmshd/content"
import { IMessage, IRelationshipTemplate, Message, RelationshipTemplate } from "@nmshd/transport"

export interface IReceivedIncomingRequestParameters extends ISerializable {
    // id?: CoreId
    content: Request
    sourceObject: IMessage | IRelationshipTemplate
}

export class ReceivedIncomingRequestParameters extends Serializable implements IReceivedIncomingRequestParameters {
    @serialize()
    @validate()
    public content: Request

    @serialize()
    @validate()
    public sourceObject: Message | RelationshipTemplate

    public static override from(params: IReceivedIncomingRequestParameters): ReceivedIncomingRequestParameters {
        return super.fromT(params, ReceivedIncomingRequestParameters)
    }
}
