import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { IRelationshipChange, IRelationshipTemplate, RelationshipChange, RelationshipTemplate } from "@nmshd/transport"

export interface ICreateOutgoingRequestFromRelationshipCreationChangeParameters extends ISerializableAsync {
    template: IRelationshipTemplate
    creationChange: IRelationshipChange
}

@type("CreateOutgoingRequestFromRelationshipCreationChangeParameters")
export class CreateOutgoingRequestFromRelationshipCreationChangeParameters
    extends SerializableAsync
    implements ICreateOutgoingRequestFromRelationshipCreationChangeParameters
{
    @serialize()
    @validate()
    public template: RelationshipTemplate

    @serialize()
    @validate()
    public creationChange: RelationshipChange

    public static override async from(
        value: ICreateOutgoingRequestFromRelationshipCreationChangeParameters
    ): Promise<CreateOutgoingRequestFromRelationshipCreationChangeParameters> {
        return await super.fromT(value, CreateOutgoingRequestFromRelationshipCreationChangeParameters)
    }
}
