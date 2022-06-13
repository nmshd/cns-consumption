import {
    IdentityAttribute,
    ProposeAttributeAcceptResponseItem,
    ProposeAttributeRequestItem,
    RejectResponseItem,
    RelationshipAttribute,
    Request,
    ResponseItemResult
} from "@nmshd/content"
import { CoreAddress, CoreId, TransportErrors } from "@nmshd/transport"
import { ConsumptionErrors } from "../../../../consumption"
import { ConsumptionAttribute } from "../../../attributes/local/ConsumptionAttribute"
import { ConsumptionRequest } from "../../local/ConsumptionRequest"
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import validateQuery from "../utility/validateQuery"
import { ValidationResult } from "../ValidationResult"
import {
    AcceptProposeAttributeRequestItemParameters,
    AcceptProposeAttributeRequestItemParametersJSON
} from "./AcceptProposeAttributeRequestItemParameters"

export class ProposeAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    ProposeAttributeRequestItem,
    AcceptProposeAttributeRequestItemParametersJSON
> {
    public override canCreateOutgoingRequestItem(
        requestItem: ProposeAttributeRequestItem,
        _request: Request,
        recipient: CoreAddress
    ): ValidationResult {
        const queryValidationResult = validateQuery(
            requestItem.query,
            this.consumptionController.accountController.identity.address,
            recipient
        )
        if (queryValidationResult.isError()) {
            return queryValidationResult
        }

        return ValidationResult.success()
    }

    public override async canAccept(
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<ValidationResult> {
        const parsedParams: AcceptProposeAttributeRequestItemParameters =
            AcceptProposeAttributeRequestItemParameters.from(params)

        if (parsedParams.attributeId) {
            const foundAttribute = await this.consumptionController.attributes.getConsumptionAttribute(
                parsedParams.attributeId
            )

            if (!foundAttribute) {
                return ValidationResult.error(
                    TransportErrors.general.recordNotFound(ConsumptionAttribute, request.id.toString())
                )
            }

            if (!this.consumptionController.accountController.identity.isMe(foundAttribute.content.owner)) {
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
        _requestItem: ProposeAttributeRequestItem,
        params: AcceptProposeAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<ProposeAttributeAcceptResponseItem> {
        const parsedParams: AcceptProposeAttributeRequestItemParameters =
            AcceptProposeAttributeRequestItemParameters.from(params)

        let sharedConsumptionAttribute: ConsumptionAttribute
        if (parsedParams.attributeId) {
            sharedConsumptionAttribute = await this.copyExistingAttribute(parsedParams.attributeId, request)
        } else {
            sharedConsumptionAttribute = await this.createNewAttribute(parsedParams.attribute!, request)
        }

        return ProposeAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedConsumptionAttribute.id,
            attribute: sharedConsumptionAttribute.content
        })
    }

    private async copyExistingAttribute(attributeId: CoreId, request: ConsumptionRequest) {
        return await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
            attributeId: CoreId.from(attributeId),
            peer: CoreAddress.from(request.peer),
            requestReference: CoreId.from(request.id)
        })
    }

    private async createNewAttribute(
        attribute: IdentityAttribute | RelationshipAttribute,
        request: ConsumptionRequest
    ) {
        if (attribute instanceof IdentityAttribute) {
            const repositoryConsumptionAttribute =
                await this.consumptionController.attributes.createConsumptionAttribute({
                    content: attribute
                })

            return await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
                attributeId: CoreId.from(repositoryConsumptionAttribute.id),
                peer: CoreAddress.from(request.peer),
                requestReference: CoreId.from(request.id)
            })
        }

        return await this.consumptionController.attributes.createPeerConsumptionAttribute({
            content: attribute,
            peer: request.peer,
            requestReference: CoreId.from(request.id)
        })
    }

    public override async applyIncomingResponseItem(
        responseItem: ProposeAttributeAcceptResponseItem | RejectResponseItem,
        _requestItem: ProposeAttributeRequestItem,
        request: ConsumptionRequest
    ): Promise<void> {
        if (!(responseItem instanceof ProposeAttributeAcceptResponseItem)) {
            return
        }

        await this.consumptionController.attributes.createPeerConsumptionAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            peer: request.peer,
            requestReference: request.id
        })
    }
}
