import {
    IdentityAttribute,
    ReadAttributeAcceptResponseItem,
    ReadAttributeRequestItem,
    RejectResponseItem,
    ResponseItemResult
} from "@nmshd/content"
import { CoreAddress, CoreId, TransportErrors } from "@nmshd/transport"
import { ConsumptionErrors } from "../../../../consumption"
import { ConsumptionAttribute } from "../../../attributes/local/ConsumptionAttribute"
import { ConsumptionRequest } from "../../local/ConsumptionRequest"
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import { ValidationResult } from "../ValidationResult"
import {
    AcceptReadAttributeRequestItemParameters,
    AcceptReadAttributeRequestItemParametersJSON
} from "./AcceptReadAttributeRequestItemParameters"

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    ReadAttributeRequestItem,
    AcceptReadAttributeRequestItemParametersJSON
> {
    public override async canAccept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<ValidationResult> {
        const parsedParams: AcceptReadAttributeRequestItemParameters =
            AcceptReadAttributeRequestItemParameters.from(params)

        if (params.attribute && params.attributeId) {
            throw new Error("You cannot specify both attribute and attributeId.")
        }

        if (!params.attribute && !params.attributeId) {
            throw new Error("Either attribute or attributeId must be provided")
        }

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
                return ValidationResult.error(ConsumptionErrors.requests.canOnlyShareOwnAttributes())
            }
        }

        return ValidationResult.success()
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<ReadAttributeAcceptResponseItem> {
        const parsedParams: AcceptReadAttributeRequestItemParameters =
            AcceptReadAttributeRequestItemParameters.from(params)

        let sharedConsumptionAttribute: ConsumptionAttribute
        if (parsedParams.attributeId) {
            sharedConsumptionAttribute =
                await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
                    attributeId: CoreId.from(parsedParams.attributeId),
                    peer: CoreAddress.from(request.peer),
                    requestReference: CoreId.from(request.id)
                })
        } else {
            // eslint-disable-next-line no-lonely-if
            if (parsedParams.attribute instanceof IdentityAttribute) {
                const repositoryConsumptionAttribute =
                    await this.consumptionController.attributes.createConsumptionAttribute({
                        content: parsedParams.attribute
                    })

                sharedConsumptionAttribute =
                    await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
                        attributeId: CoreId.from(repositoryConsumptionAttribute.id),
                        peer: CoreAddress.from(request.peer),
                        requestReference: CoreId.from(request.id)
                    })
            } else {
                sharedConsumptionAttribute = await this.consumptionController.attributes.createRelationshipAttribute({
                    content: parsedParams.attribute!,
                    peer: request.peer,
                    requestReference: CoreId.from(request.id)
                })
            }
        }

        return ReadAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedConsumptionAttribute.id,
            attribute: sharedConsumptionAttribute.content
        })
    }

    public override async applyIncomingResponseItem(
        responseItem: ReadAttributeAcceptResponseItem | RejectResponseItem,
        _requestItem: ReadAttributeRequestItem,
        request: ConsumptionRequest
    ): Promise<void> {
        if (!(responseItem instanceof ReadAttributeAcceptResponseItem)) {
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
