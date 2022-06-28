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

export interface AcceptProposeAttributeRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    /**
     * Pass an `attributeId` to send a copy of an existing attribute to the peer.
     */
    attributeId?: string

    /**
     * Pass an `attribute` to create a new Local Attribute. If you want to use the proposed Attribute, just pass it here.
     */
    attribute?: IdentityAttributeJSON | RelationshipAttributeJSON
}

@type("AcceptProposeAttributeRequestItemParameters")
export class AcceptProposeAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate({ nullable: true })
    public attributeId?: CoreId

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate({ nullable: true })
    public attribute?: IdentityAttribute | RelationshipAttribute

    public static from(
        value: AcceptProposeAttributeRequestItemParametersJSON
    ): AcceptProposeAttributeRequestItemParameters {
        return this.fromAny(value)
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        const typedValue = value as AcceptProposeAttributeRequestItemParameters

        if (typedValue.attributeId && typedValue.attribute) {
            throw new ValidationError(
                AcceptProposeAttributeRequestItemParameters.name,
                nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attribute),
                `You cannot specify both ${nameof<AcceptProposeAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} and ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
            )
        }

        if (!typedValue.attributeId && !typedValue.attribute) {
            throw new ValidationError(
                AcceptProposeAttributeRequestItemParameters.name,
                nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attribute),
                `You have to specify either ${nameof<AcceptProposeAttributeRequestItemParameters>(
                    (x) => x.attribute
                )} or ${nameof<AcceptProposeAttributeRequestItemParameters>((x) => x.attributeId)}.`
            )
        }

        return value
    }
}
