import { ISerializable, Serializable, serialize, validate } from "@js-soft/ts-serval"
import { IdentityAttribute, IIdentityAttribute, IRelationshipAttribute, RelationshipAttribute } from "@nmshd/content"
import { CoreDate, CoreId, ICoreDate, ICoreId } from "@nmshd/transport"

export interface ISucceedConsumptionAttributeParams extends ISerializable {
    successorContent: IIdentityAttribute | IRelationshipAttribute
    succeeds: ICoreId
    validFrom?: ICoreDate
}

export class SucceedConsumptionAttributeParams extends Serializable implements ISucceedConsumptionAttributeParams {
    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate()
    public successorContent: IdentityAttribute | RelationshipAttribute

    @serialize()
    @validate()
    public succeeds: CoreId

    @serialize()
    @validate({ nullable: true })
    public validFrom?: CoreDate

    public static from(value: ISucceedConsumptionAttributeParams): SucceedConsumptionAttributeParams {
        return this.fromAny(value)
    }
}
