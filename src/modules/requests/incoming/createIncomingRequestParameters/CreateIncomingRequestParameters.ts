import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { Request } from "@nmshd/content"
import { Message, RelationshipTemplate } from "@nmshd/transport"

export interface ICreateIncomingRequestParameters extends ISerializable {
    // id?: CoreId
    content: Request
    source: Message | RelationshipTemplate
}

export class CreateIncomingRequestParameters extends Serializable implements ICreateIncomingRequestParameters {
    @serialize()
    @validate()
    public content: Request

    @serialize()
    @validate()
    public source: Message | RelationshipTemplate

    public static from(params: ICreateIncomingRequestParameters): CreateIncomingRequestParameters {
        return super.fromT(params, CreateIncomingRequestParameters)
    }
}
