import {
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

        const attribute = await this.consumptionController.attributes.getConsumptionAttribute(parsedParams.attributeId)

        if (!attribute) {
            return ValidationResult.error(
                TransportErrors.general.recordNotFound(ConsumptionAttribute, request.id.toString())
            )
        }

        if (!this.consumptionController.accountController.identity.isMe(attribute.content.owner)) {
            return ValidationResult.error(ConsumptionErrors.requests.canOnlyShareOwnAttributes())
        }
        return ValidationResult.success()
    }

    public override async accept(
        _requestItem: ReadAttributeRequestItem,
        params: AcceptReadAttributeRequestItemParametersJSON,
        request: ConsumptionRequest
    ): Promise<ReadAttributeAcceptResponseItem> {
        const consumptionAttribute = await this.consumptionController.attributes.createSharedConsumptionAttributeCopy({
            attributeId: CoreId.from(params.attributeId),
            peer: CoreAddress.from(request.peer),
            requestReference: CoreId.from(request.id)
        })

        return ReadAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: consumptionAttribute.id,
            attribute: consumptionAttribute.content
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