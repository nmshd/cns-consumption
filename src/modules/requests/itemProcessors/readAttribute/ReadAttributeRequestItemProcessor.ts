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
import { LocalAttribute } from "../../../attributes/local/LocalAttribute"
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor"
import { LocalRequestInfo } from "../IRequestItemProcessor"
import validateQuery from "../utility/validateQuery"
import { ValidationResult } from "../ValidationResult"
import {
    AcceptReadAttributeRequestItemParametersWithExistingAttribute,
    AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
} from "./AcceptReadAttributeRequestItemParametersWithExistingAttribute"
import {
    AcceptReadAttributeRequestItemParametersWithNewAttribute,
    AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
} from "./AcceptReadAttributeRequestItemParametersWithNewAttribute"

export class ReadAttributeRequestItemProcessor extends GenericRequestItemProcessor<
    ReadAttributeRequestItem,
    | AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
    | AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
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
        params:
            | AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
            | AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ValidationResult> {
        const parsedParams = this.parseAcceptParams(params)

        if (parsedParams instanceof AcceptReadAttributeRequestItemParametersWithExistingAttribute) {
            const foundAttribute = await this.consumptionController.attributes.getLocalAttribute(
                parsedParams.attributeId
            )

            if (!foundAttribute) {
                return ValidationResult.error(
                    TransportErrors.general.recordNotFound(LocalAttribute, requestInfo.id.toString())
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
        params:
            | AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
            | AcceptReadAttributeRequestItemParametersWithNewAttributeJSON,
        requestInfo: LocalRequestInfo
    ): Promise<ReadAttributeAcceptResponseItem> {
        const parsedParams = this.parseAcceptParams(params)

        let sharedLocalAttribute: LocalAttribute
        if (parsedParams instanceof AcceptReadAttributeRequestItemParametersWithExistingAttribute) {
            sharedLocalAttribute = await this.copyExistingAttribute(parsedParams.attributeId, requestInfo)
        } else {
            sharedLocalAttribute = await this.createNewAttribute(parsedParams.newAttributeValue, requestInfo)
        }

        return ReadAttributeAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            attributeId: sharedLocalAttribute.id,
            attribute: sharedLocalAttribute.content
        })
    }

    private parseAcceptParams(
        params:
            | AcceptReadAttributeRequestItemParametersWithExistingAttributeJSON
            | AcceptReadAttributeRequestItemParametersWithNewAttributeJSON
    ) {
        let parsedParams:
            | AcceptReadAttributeRequestItemParametersWithExistingAttribute
            | AcceptReadAttributeRequestItemParametersWithNewAttribute
        try {
            parsedParams = AcceptReadAttributeRequestItemParametersWithExistingAttribute.fromAny(params)
        } catch (e) {
            parsedParams = AcceptReadAttributeRequestItemParametersWithNewAttribute.fromAny(params)
        }
        return parsedParams
    }

    private async copyExistingAttribute(attributeId: CoreId, requestInfo: LocalRequestInfo) {
        return await this.consumptionController.attributes.createSharedLocalAttributeCopy({
            attributeId: CoreId.from(attributeId),
            peer: CoreAddress.from(requestInfo.peer),
            requestReference: CoreId.from(requestInfo.id)
        })
    }

    private async createNewAttribute(
        attribute: IdentityAttribute | RelationshipAttribute,
        requestInfo: LocalRequestInfo
    ) {
        if (attribute instanceof IdentityAttribute) {
            const repositoryLocalAttribute = await this.consumptionController.attributes.createLocalAttribute({
                content: attribute
            })

            return await this.consumptionController.attributes.createSharedLocalAttributeCopy({
                attributeId: CoreId.from(repositoryLocalAttribute.id),
                peer: CoreAddress.from(requestInfo.peer),
                requestReference: CoreId.from(requestInfo.id)
            })
        }

        return await this.consumptionController.attributes.createPeerLocalAttribute({
            content: attribute,
            peer: requestInfo.peer,
            requestReference: CoreId.from(requestInfo.id)
        })
    }

    public override async applyIncomingResponseItem(
        responseItem: ReadAttributeAcceptResponseItem | RejectResponseItem,
        _requestItem: ReadAttributeRequestItem,
        requestInfo: LocalRequestInfo
    ): Promise<void> {
        if (!(responseItem instanceof ReadAttributeAcceptResponseItem)) {
            return
        }

        await this.consumptionController.attributes.createPeerLocalAttribute({
            id: responseItem.attributeId,
            content: responseItem.attribute,
            peer: requestInfo.peer,
            requestReference: requestInfo.id
        })
    }
}
