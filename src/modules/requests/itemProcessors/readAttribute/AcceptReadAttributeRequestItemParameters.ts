import { Serializable, serialize, type, validate, ValidationError } from "@js-soft/ts-serval"
import {
    IdentityAttribute,
    IdentityAttributeJSON,
    RelationshipAttribute,
    RelationshipAttributeJSON
} from "@nmshd/content"
import { CoreId } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters"

export interface AcceptReadAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    attributeId?: string
    attribute?: IdentityAttributeJSON | RelationshipAttributeJSON
}

@type("AcceptReadAttributeRequestItemParameters")
export class AcceptReadAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate({ nullable: true })
    public attributeId?: CoreId

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate({ nullable: true })
    public attribute?: IdentityAttribute | RelationshipAttribute

    public static from(value: AcceptReadAttributeRequestItemParametersJSON): AcceptReadAttributeRequestItemParameters {
        return this.fromAny(value)
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        const typedValue = value as AcceptReadAttributeRequestItemParameters

        if (typedValue.attributeId && typedValue.attribute) {
            throw new ValidationError(
                AcceptReadAttributeRequestItemParameters.name,
                nameof<AcceptReadAttributeRequestItemParameters>((x) => x.attribute),
                `You cannot specify both ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} and ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.attributeId)}.`
            )
        }

        if (!typedValue.attributeId && !typedValue.attribute) {
            throw new ValidationError(
                AcceptReadAttributeRequestItemParameters.name,
                nameof<AcceptReadAttributeRequestItemParameters>((x) => x.attribute),
                `You have to specify either ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} or ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.attributeId)}.`
            )
        }

        return value
    }
}
