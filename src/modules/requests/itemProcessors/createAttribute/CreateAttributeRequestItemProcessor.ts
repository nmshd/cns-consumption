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
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import { ConsumptionRequestInfo } from "../IRequestItemProcessor"
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
        const iAmOwnerOfTheAttribute = this.accountController.identity.isMe(requestItem.attribute.owner)

        if (!iAmOwnerOfTheAttribute) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    `Cannot send Identity Attributes of which you are not the owner via ${CreateAttributeRequestItem.name}. Consider using a ${ProposeAttributeRequestItem.name} instead.`
                )
            )
        }

        return ValidationResult.success()
    }

    private canCreateRequestItemWithRelationshipAttribute(requestItem: CreateAttributeRequestItem) {
        const iAmOwnerOfTheAttribute = this.accountController.identity.isMe(requestItem.attribute.owner)

        if (!iAmOwnerOfTheAttribute) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "Cannot send Relationship Attributes of which you are not the owner."
                )
            )
        }

        return ValidationResult.success()
    }

    public override async accept(
        requestItem: CreateAttributeRequestItem,
        _params: AcceptCreateAttributeRequestItemParametersJSON,
        requestInfo: ConsumptionRequestInfo
    ): Promise<CreateAttributeAcceptResponseItem> {
        const peerConsumptionAttribute = await this.consumptionController.attributes.createPeerConsumptionAttribute({
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
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
        requestInfo: ConsumptionRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof CreateAttributeAcceptResponseItem)) {
            return
        }

        /* TODO: in case of an own IdentityAttribute that was sent to the peer, we need to specify a source attribute; but currently we can't find the source attribute, because we don't know the id the user picked when sending the request */

        await this.consumptionController.attributes.createPeerConsumptionAttribute({
            id: responseItem.attributeId,
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        })
    }
}
