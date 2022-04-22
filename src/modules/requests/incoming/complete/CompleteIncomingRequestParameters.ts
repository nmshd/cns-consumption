import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId, IMessage, IRelationshipChange, Message, RelationshipChange } from "@nmshd/transport"

export interface ICompleteIncomingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
    responseSourceObject: IMessage | IRelationshipChange
}

export class CompleteIncomingRequestParameters extends SerializableAsync implements ICompleteIncomingRequestParameters {
    @serialize()
    @validate()
    public requestId: CoreId

    @serialize({ unionTypes: [Message, RelationshipChange] })
    @validate()
    public responseSourceObject: Message | RelationshipChange

    public static override async from(
        value: ICompleteIncomingRequestParameters
    ): Promise<CompleteIncomingRequestParameters> {
        return await super.fromT(value, CompleteIncomingRequestParameters)
    }
}
