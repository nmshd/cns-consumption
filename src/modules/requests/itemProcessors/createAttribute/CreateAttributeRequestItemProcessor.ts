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
import { LocalRequestInfo } from "../IRequestItemProcessor"
import { ValidationResult } from "../ValidationResult"
import { AcceptCreateAttributeRequestItemParametersJSON } from "./AcceptCreateAttributeRequestItemParameters"

export class CreateAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    CreateAttributeRequestItem,
    AcceptCreateAttributeRequestItemParametersJSON
> {
    public override canCreateOutgoingRequestItem(
        requestItem: CreateAttributeRequestItem,
        _request: Request,
        recipient: CoreAddress
    ): ValidationResult | Promise<ValidationResult> {
        const recipientIsOwnerOfTheAttribute = requestItem.attribute.owner.equals(recipient)

        // When the owner of the Attribute is not the recipient of the Request, this means that
        // we need to set the sourceAttributeId, because we have to set shareInfo as soon as the
        // RequestItem was accepted.
        if (!recipientIsOwnerOfTheAttribute && !requestItem.sourceAttributeId) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "'sourceAttributeId' cannot be undefined when sending an attribute that is not owned by the recipient."
                )
            )
        }

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
        requestInfo: LocalRequestInfo
    ): Promise<CreateAttributeAcceptResponseItem> {
        const peerLocalAttribute = await this.consumptionController.attributes.createPeerLocalAttribute({
            content: requestItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        })

        return CreateAttributeAcceptResponseItem.from({
            attributeId: peerLocalAttribute.id,
            result: ResponseItemResult.Accepted
        })
    }

    public override async applyIncomingResponseItem(
        responseItem: CreateAttributeAcceptResponseItem | RejectResponseItem,
        requestItem: CreateAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof CreateAttributeAcceptResponseItem)) {
            return
        }

        if (requestItem.sourceAttributeId) {
            const sourceAttribute = await this.consumptionController.attributes.getLocalAttribute(
                requestItem.sourceAttributeId
            )

            await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                attributeId: responseItem.attributeId,
                sourceAttributeId: sourceAttribute!.id,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            })
        } else {
            await this.consumptionController.attributes.createPeerLocalAttribute({
                id: responseItem.attributeId,
                content: requestItem.attribute,
                peer: requestInfo.peer,
                requestReference: requestInfo.id
            })
        }
    }
}
