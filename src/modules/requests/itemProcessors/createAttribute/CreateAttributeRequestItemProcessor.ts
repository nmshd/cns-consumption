import {
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    IdentityAttribute,
    RejectResponseItem,
    ResponseItemResult
} from "@nmshd/content"
import { ConsumptionErrors } from "../../../../consumption"
import { ConsumptionRequest } from "../../local/ConsumptionRequest"
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import { ValidationResult } from "../ValidationResult"
import { AcceptCreateAttributeRequestItemParametersJSON } from "./AcceptCreateAttributeRequestItemParameters"

export class CreateAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    CreateAttributeRequestItem,
    AcceptCreateAttributeRequestItemParametersJSON
> {
    public override canCreateOutgoingRequestItem(
        requestItem: CreateAttributeRequestItem
    ): ValidationResult | Promise<ValidationResult> {
        // TODO: remove the following if we for sure only allow RelationshipAttributes in a RequestItem
        if (requestItem.attribute instanceof IdentityAttribute) {
            // It doesn't make sense to send a CreateAttributeRequestItem with an IdentityAttribute. E.g. the following cases would have to be handled:
            // - The RequestItem contains an Attribute (e.g. GivenName) with the same value as an already existing Attribute
            //  => Should the user reject the request? If not, do we save a new Attribute with the same value?
            // - The RequestItem contains an Attribute (e.g. GivenName) with the a different value than an already existing Attribute
            // - ...
            return ValidationResult.error(
                ConsumptionErrors.requests.cannotSendCreateAttributeRequestItemsWithIdentityAttributes()
            )
        }

        return ValidationResult.success()
    }

    public override async accept(
        requestItem: CreateAttributeRequestItem,
        _params: AcceptCreateAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<CreateAttributeAcceptResponseItem> {
        if (requestItem.attribute instanceof IdentityAttribute) {
            throw new Error("IdentityAttribute not supported") // TODO: allow only Relationship Attributes in RequestItem?
        }

        const result = await this.consumptionController.attributes.createRelationshipAttribute({
            content: requestItem.attribute,
            peer: request.peer,
            requestReference: request.id
        })

        return CreateAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: result.id
        })
    }

    public override async applyIncomingResponseItem(
        responseItem: CreateAttributeAcceptResponseItem | RejectResponseItem,
        requestItem: CreateAttributeRequestItem,
        request: ConsumptionRequest
    ): Promise<void> {
        if (!(responseItem instanceof CreateAttributeAcceptResponseItem)) {
            return
        }

        await this.consumptionController.attributes.createPeerConsumptionAttribute({
            id: responseItem.attributeId,
            content: requestItem.attribute,
            peer: request.peer,
            requestReference: request.id
        })
    }
}
