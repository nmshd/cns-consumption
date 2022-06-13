import { AbstractAttributeQuery, RelationshipAttributeQuery } from "@nmshd/content"
import { CoreAddress } from "@nmshd/transport"
import { ConsumptionErrors } from "../../../../consumption"
import { ValidationResult } from "../ValidationResult"

export default function validateQuery(
    query: AbstractAttributeQuery,
    sender: CoreAddress,
    recipient: CoreAddress
): ValidationResult {
    if (query instanceof RelationshipAttributeQuery) {
        if (query.thirdParty?.equals(sender)) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "Cannot query an Attribute with the own address as third party."
                )
            )
        }

        if (query.thirdParty?.equals(recipient)) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "Cannot query an Attribute with the recipient's address as third party."
                )
            )
        }

        if (query.owner.equals(sender) && query.thirdParty !== undefined) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem("Cannot query own Attributes from a third party.")
            )
        }
    }

    return ValidationResult.success()
}
