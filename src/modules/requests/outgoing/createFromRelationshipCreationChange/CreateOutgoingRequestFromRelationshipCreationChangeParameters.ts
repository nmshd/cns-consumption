import { ISerializable, Serializable, serialize, type, validate } from "@js-soft/ts-serval"
import { IRelationshipChange, IRelationshipTemplate, RelationshipChange, RelationshipTemplate } from "@nmshd/transport"

export interface ICreateOutgoingRequestFromRelationshipCreationChangeParameters extends ISerializable {
    template: IRelationshipTemplate
    creationChange: IRelationshipChange
}

@type("CreateOutgoingRequestFromRelationshipCreationChangeParameters")
export class CreateOutgoingRequestFromRelationshipCreationChangeParameters
    extends Serializable
    implements ICreateOutgoingRequestFromRelationshipCreationChangeParameters
{
    @serialize()
    @validate()
    public template: RelationshipTemplate

    @serialize()
    @validate()
    public creationChange: RelationshipChange

    public static from(
        value: ICreateOutgoingRequestFromRelationshipCreationChangeParameters
    ): CreateOutgoingRequestFromRelationshipCreationChangeParameters {
        return this.fromAny(value)
    }
}
