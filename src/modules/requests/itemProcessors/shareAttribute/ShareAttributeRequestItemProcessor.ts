import {
    AcceptResponseItem,
    Attribute,
    CreateAttributeRequestItem,
    IdentityAttribute,
    RelationshipAttribute,
    Request,
    ResponseItemResult,
    ShareAttributeRequestItem
} from "@nmshd/content"
import { CoreAddress, TransportErrors } from "@nmshd/transport"
import { ConsumptionErrors } from "../../../../consumption"
import { ConsumptionAttribute } from "../../../attributes/local/ConsumptionAttribute"
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import { ConsumptionRequestInfo } from "../IRequestItemProcessor"
import { ValidationResult } from "../ValidationResult"
import { AcceptShareAttributeRequestItemParametersJSON } from "./AcceptShareAttributeRequestItemParameters"

export class ShareAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    ShareAttributeRequestItem,
    AcceptShareAttributeRequestItemParametersJSON
> {
    public override async canCreateOutgoingRequestItem(
        requestItem: ShareAttributeRequestItem,
        _request: Request,
        recipient: CoreAddress
    ): Promise<ValidationResult> {
        const attribute = await this.consumptionController.attributes.getConsumptionAttribute(requestItem.attributeId)
        if (!attribute) {
            return ValidationResult.error(
                TransportErrors.general.recordNotFound(Attribute, requestItem.attributeId.toString())
            )
        }

        const attributeOwnerValidationResult = this.validateAttributeOwner(
            attribute.content,
            this.currentIdentityAddress,
            recipient
        )
        if (attributeOwnerValidationResult.isError()) {
            return attributeOwnerValidationResult
        }

        return ValidationResult.success()
    }

    public override async checkPrerequisitesOfIncomingRequestItem(
        requestItem: ShareAttributeRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): Promise<boolean> {
        const relationshipToShareWith = await this.accountController.relationships.getRelationshipToIdentity(
            requestItem.shareWith
        )

        if (!relationshipToShareWith) {
            return false // Should the containing Request move to Error state?
        }

        const attribute = await this.consumptionController.attributes.getConsumptionAttribute(requestItem.attributeId)

        if (!attribute) {
            return false // Should the containing Request move to Error state?
        }

        if (this.validateAttributeOwner(attribute.content, requestInfo.peer, this.currentIdentityAddress).isError()) {
            return false
        }

        return true
    }

    private validateAttributeOwner(
        attribute: IdentityAttribute | RelationshipAttribute,
        sender: CoreAddress,
        recipient: CoreAddress
    ): ValidationResult {
        const attributeOwner = attribute.owner
        if (attribute instanceof IdentityAttribute) {
            if (!attributeOwner.equals(recipient)) {
                return ValidationResult.error(
                    ConsumptionErrors.requests.invalidRequestItem(
                        "Can only request sharing of identity attributes owned by the recipient."
                    )
                )
            }
        }

        if (attribute instanceof RelationshipAttribute) {
            if (!attributeOwner.equals(recipient) && !attributeOwner.equals(sender)) {
                return ValidationResult.error(
                    ConsumptionErrors.requests.invalidRequestItem(
                        "Cannot request sharing of relationship attributes not owned by recipient or sender."
                    )
                )
            }
        }

        return ValidationResult.success()
    }

    public override canAccept(
        _requestItem: ShareAttributeRequestItem,
        _params: AcceptShareAttributeRequestItemParametersJSON,
        _requestInfo: ConsumptionRequestInfo
    ): ValidationResult {
        return ValidationResult.success()
    }

    public override async accept(
        requestItem: ShareAttributeRequestItem,
        _params: AcceptShareAttributeRequestItemParametersJSON,
        _requestInfo: ConsumptionRequestInfo
    ): Promise<AcceptResponseItem> {
        const attribute = await this.consumptionController.attributes.getConsumptionAttribute(requestItem.attributeId)

        if (!(await this.isAttributeAlreadyShared(attribute!, requestItem.shareWith))) {
            await this.shareAttribute(attribute, requestItem.shareWith)
        }

        return AcceptResponseItem.from({ result: ResponseItemResult.Accepted })
    }

    private async isAttributeAlreadyShared(attribute: ConsumptionAttribute, shareWith: CoreAddress) {
        if (attribute.content instanceof IdentityAttribute) {
            return (
                (
                    await this.consumptionController.attributes.getConsumptionAttributes({
                        "shareInfo.sourceAttribute": attribute.shareInfo!.sourceAttribute!.toString(), // eslint-disable-line @typescript-eslint/naming-convention
                        "shareInfo.peer": shareWith.toString() // eslint-disable-line @typescript-eslint/naming-convention
                    })
                ).length > 0
            )
        }
        return (
            (
                await this.consumptionController.attributes.getConsumptionAttributes({
                    "shareInfo.sourceAttribute": attribute.id.toString(), // eslint-disable-line @typescript-eslint/naming-convention
                    "shareInfo.peer": shareWith.toString() // eslint-disable-line @typescript-eslint/naming-convention
                })
            ).length > 0
        )
    }

    private async shareAttribute(attribute: ConsumptionAttribute | undefined, shareWith: CoreAddress) {
        const createAttributeRequestItem = CreateAttributeRequestItem.from({
            attribute: attribute!.content,
            mustBeAccepted: true
        })

        const createAttributeRequest = await this.consumptionController.outgoingRequests.create({
            peer: shareWith,
            content: Request.from({
                items: [createAttributeRequestItem]
            })
        })

        const message = await this.accountController.messages.sendMessage({
            recipients: [shareWith],
            content: createAttributeRequest.content
        })

        await this.consumptionController.outgoingRequests.sent({
            requestId: createAttributeRequest.id,
            requestSourceObject: message
        })
    }
}
