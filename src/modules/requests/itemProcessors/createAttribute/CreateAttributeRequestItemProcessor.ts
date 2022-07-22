import {
    CreateAttributeAcceptResponseItem,
    CreateAttributeRequestItem,
    IdentityAttribute,
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
        _recipient: CoreAddress
    ): ValidationResult | Promise<ValidationResult> {
        if (
            requestItem.attribute.owner.toString() !== "" &&
            !requestItem.attribute.owner.equals(this.currentIdentityAddress)
        ) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "The owner of the given `attribute` can only be an empty string. This is because you can only send Attributes where the recipient of the Request is the owner anyway. And in order to avoid mistakes, the owner will be automatically filled for you."
                )
            )
        }

        if (requestItem.attribute instanceof IdentityAttribute) {
            return this.canCreateRequestItemWithIdentityAttribute(requestItem)
        }

        return ValidationResult.success()
    }

    private canCreateRequestItemWithIdentityAttribute(requestItem: CreateAttributeRequestItem): ValidationResult {
        if (!requestItem.sourceAttributeId) {
            return ValidationResult.error(
                ConsumptionErrors.requests.invalidRequestItem(
                    "'sourceAttributeId' cannot be undefined when sending an Identity Attribute."
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
