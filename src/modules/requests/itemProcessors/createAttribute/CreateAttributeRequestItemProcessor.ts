import {
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    IdentityAttribute,
    ProposeAttributeRequestItem,
    RejectResponseItem,
    Request,
    ResponseItemResult
} from "@nmshd/content"
import { CoreAddress } from "@nmshd/transport"
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
        requestItem: CreateAttributeRequestItem,
        _request: Request,
        _recipient: CoreAddress
    ): ValidationResult | Promise<ValidationResult> {
        if (requestItem.attribute instanceof IdentityAttribute) {
            return this.canCreateRequestItemWithIdentityAttribute(requestItem)
        }

        return this.canCreateRequestItemWithRelationshipAttribute(requestItem)
    }

    private canCreateRequestItemWithIdentityAttribute(requestItem: CreateAttributeRequestItem): ValidationResult {
        const iAmOwnerOfTheAttribute = this.consumptionController.accountController.identity.isMe(
            requestItem.attribute.owner
        )

        if (!iAmOwnerOfTheAttribute) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    `Cannot send Identity Attributes where you are not the owner via ${CreateAttributeRequestItem.name}. Consider using a ${ProposeAttributeRequestItem.name} instead.`
                )
            )
        }

        return ValidationResult.success()
    }

    private canCreateRequestItemWithRelationshipAttribute(requestItem: CreateAttributeRequestItem) {
        const iAmOwnerOfTheAttribute = this.consumptionController.accountController.identity.isMe(
            requestItem.attribute.owner
        )

        if (!iAmOwnerOfTheAttribute) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "Cannot send Relationship Attributes where you are not the owner."
                )
            )
        }

        return ValidationResult.success()
    }

    public override async accept(
        requestItem: CreateAttributeRequestItem,
        _params: AcceptCreateAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<CreateAttributeAcceptResponseItem> {
        const peerConsumptionAttribute = await this.consumptionController.attributes.createPeerConsumptionAttribute({
            content: requestItem.attribute,
            peer: request.peer,
            requestReference: request.id
        })

        return CreateAttributeAcceptResponseItem.from({
            attributeId: peerConsumptionAttribute.id,
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
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
