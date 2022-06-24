import {
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content"
import { CoreAddress, CoreId, TransportErrors } from "@nmshd/transport"
import { ConsumptionErrors } from "../../../../consumption"
import { ConsumptionAttribute } from "../../../attributes/local/ConsumptionAttribute"
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import { ConsumptionRequestInfo } from "../IRequestItemProcessor"
import validateQuery from "../utility/validateQuery"
import { ValidationResult } from "../ValidationResult"
import {
    AcceptReadAttributeRequestItemParameters,
    AcceptReadAttributeRequestItemParametersJSON
} from "./AcceptReadAttributeRequestItemParameters"

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    ReadAttributeRequestItem,
    AcceptReadAttributeRequestItemParametersJSON
> {
    public override canCreateOutgoingRequestItem(
        requestItem: ReadAttributeRequestItem,
        _request: Request,
        recipient: CoreAddress
    ): ValidationResult {
        const queryValidationResult = validateQuery(requestItem.query, this.currentIdentityAddress, recipient)
        if (queryValidationResult.isError()) {
            return queryValidationResult
        }

        return ValidationResult.success()
    }

    public override async canAccept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: ConsumptionRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams: AcceptReadAttributeRequestItemParameters =
            AcceptReadAttributeRequestItemParameters.from(params)

        if (parsedParams.attributeId) {
            const foundAttribute = await this.consumptionController.attributes.getConsumptionAttribute(
                parsedParams.attributeId
            )

            if (!foundAttribute) {
                return ValidationResult.error(
                    TransportErrors.general.recordNotFound(ConsumptionAttribute, requestInfo.id.toString())
                )
            }

            if (!this.accountController.identity.isMe(foundAttribute.content.owner)) {
                return ValidationResult.error(
                    ConsumptionErrors.requests.invalidRequestItem(
                        "The given Attribute belongs to someone else. You can only share own Attributes."
                    )
                )
            }
        }

        return ValidationResult.success()
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        requestInfo: ConsumptionRequestInfo
    ): Promise<ReadAttributeAcceptResponseItem> {
        const parsedParams: AcceptReadAttributeRequestItemParameters =
            AcceptReadAttributeRequestItemParameters.from(params)

        let sharedConsumptionAttribute: ConsumptionAttribute
        if (parsedParams.attributeId) {
            sharedConsumptionAttribute = await this.copyExistingAttribute(parsedParams.attributeId, requestInfo)
        } else {
            sharedConsumptionAttribute = await this.createNewAttribute(parsedParams.attribute!, requestInfo)
        }

        return ReadAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedConsumptionAttribute.id,
            attribute: sharedConsumptionAttribute.content
        })
    }

    private async copyExistingAttribute(attributeId: CoreId, requestInfo: ConsumptionRequestInfo) {
        return await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
            attributeId: CoreId.from(attributeId),
            peer: CoreAddress.from(requestInfo.peer),
            requestReference: CoreId.from(requestInfo.id)
        })
    }

    private async createNewAttribute(
        attribute: IdentityAttribute | RelationshipAttribute,
        requestInfo: ConsumptionRequestInfo
    ) {
        if (attribute instanceof IdentityAttribute) {
            const repositoryConsumptionAttribute =
                await this.consumptionController.attributes.createConsumptionAttribute({
                    content: attribute
                })

            return await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
                attributeId: CoreId.from(repositoryConsumptionAttribute.id),
                peer: CoreAddress.from(requestInfo.peer),
                requestReference: CoreId.from(requestInfo.id)
            })
        }

        return await this.consumptionController.attributes.createPeerConsumptionAttribute({
            content: attribute,
            peer: requestInfo.peer,
            requestReference: CoreId.from(requestInfo.id)
        })
    }

    public override async applyIncomingResponseItem(
        responseItem: ReadAttributeAcceptResponseItem | RejectResponseItem,
        _requestItem: ReadAttributeRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof ReadAttributeAcceptResponseItem)) {
            return
        }

        await this.consumptionController.attributes.createPeerConsumptionAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        })
    }
}
