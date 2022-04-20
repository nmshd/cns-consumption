import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"
import { IResponse, Response } from "@nmshd/content"
import { CoreId, ICoreId, IMessage, IRelationshipChange, Message, RelationshipChange } from "@nmshd/transport"

export interface ICompleteOugoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    responseSourceObject: IMessage | IRelationshipChange
    receivedResponse: IResponse
}

export class CompleteOugoingRequestParameters extends SerializableAsync implements ICompleteOugoingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize({ unionTypes: [Message, RelationshipChange] })
    @validate()
    public responseSourceObject: Message | RelationshipChange

    @serialize()
    @validate()
    public receivedResponse: Response

    public static override async from(
        value: ICompleteOugoingRequestParameters
    ): Promise<CompleteOugoingRequestParameters> {
        return await super.fromT(value, CompleteOugoingRequestParameters)
    }
}
