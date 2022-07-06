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

export interface AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
    extends AcceptRequestItemParametersJSON {
    attributeId: string
}

export interface AcceptReadAttributeRequestItemParametersWithNewAttributeJSON extends AcceptRequestItemParametersJSON {
    newAttributeValue: IdentityAttributeJSON | RelationshipAttributeJSON
}

export type AcceptReadAttributeRequestItemParametersJSON =
    | AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
    | AcceptReadAttributeRequestItemParametersWithNewAttributeJSON

@type("AcceptReadAttributeRequestItemParameters")
export class AcceptReadAttributeRequestItemParameters extends Serializable {
    @serialize()
    @validate({ nullable: true })
    public attributeId?: CoreId

    @serialize({ unionTypes: [IdentityAttribute, RelationshipAttribute] })
    @validate({ nullable: true })
    public newAttributeValue?: IdentityAttribute | RelationshipAttribute

    public isWithExistingAttribute(): this is { attributeId: CoreId } {
        return this.attributeId !== undefined
    }

    public isWithNewAttribute(): this is { newAttributeValue: IdentityAttribute | RelationshipAttribute } {
        return this.newAttributeValue !== undefined
    }

    public static from(value: AcceptReadAttributeRequestItemParametersJSON): AcceptReadAttributeRequestItemParameters {
        return this.fromAny(value)
    }

    protected static override postFrom<T extends Serializable>(value: T): T {
        if (!(value instanceof AcceptReadAttributeRequestItemParameters)) throw new Error("this should never happen")

        if (value.attributeId && value.newAttributeValue) {
            throw new ValidationError(
                AcceptReadAttributeRequestItemParameters.name,
                nameof<AcceptReadAttributeRequestItemParameters>((x) => x.newAttributeValue),
                `You cannot specify both ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.newAttributeValue
                )} and ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.attributeId)}.`
            )
        }

        if (!value.attributeId && !value.newAttributeValue) {
            throw new ValidationError(
                AcceptReadAttributeRequestItemParameters.name,
                nameof<AcceptReadAttributeRequestItemParameters>((x) => x.newAttributeValue),
                `You have to specify either ${nameof<AcceptReadAttributeRequestItemParameters>(
                    (x) => x.newAttributeValue
                )} or ${nameof<AcceptReadAttributeRequestItemParameters>((x) => x.attributeId)}.`
            )
        }

        return value
    }
}
