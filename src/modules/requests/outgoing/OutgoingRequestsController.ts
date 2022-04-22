import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import { Request, RequestItem, RequestItemGroup, Response, ResponseItem, ResponseItemGroup } from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    ICoreId,
    Message,
    RelationshipChange,
    RelationshipTemplate,
    TransportErrors
} from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry"
import { ValidationResult } from "../itemProcessors/ValidationResult"
import { ConsumptionRequest, ConsumptionRequestSource } from "../local/ConsumptionRequest"
import { ConsumptionRequestStatus } from "../local/ConsumptionRequestStatus"
import { ConsumptionResponse } from "../local/ConsumptionResponse"
import {
    CompleteOugoingRequestParameters,
    ICompleteOugoingRequestParameters
} from "./completeOutgoingRequest/CompleteOutgoingRequestParameters"
import {
    CreateOutgoingRequestFromRelationshipCreationChangeParameters,
    ICreateOutgoingRequestFromRelationshipCreationChangeParameters
} from "./createFromRelationshipCreationChange/CreateOutgoingRequestFromRelationshipCreationChangeParameters"
import {
    CreateOutgoingRequestParameters,
    ICreateOutgoingRequestParameters
} from "./createOutgoingRequest/CreateOutgoingRequestParameters"
import {
    ISentOutgoingRequestParameters,
    SentOutgoingRequestParameters
} from "./sentOutgoingRequest/SentOutgoingRequestParameters"

export class OutgoingRequestsController extends ConsumptionBaseController {
    private consumptionRequests: IDatabaseCollection

    public constructor(parent: ConsumptionController, public readonly processorRegistry: RequestItemProcessorRegistry) {
        super(ConsumptionControllerName.RequestsController, parent)
    }

    public override async init(): Promise<OutgoingRequestsController> {
        await super.init()
        this.consumptionRequests = await this.parent.accountController.getSynchronizedCollection("Requests")
        return this
    }

    public async canCreate(params: ICreateOutgoingRequestParameters): Promise<ValidationResult> {
        const parsedParams = await CreateOutgoingRequestParameters.from(params)

        const innerResults = await this.canCreateItems(parsedParams.content.items)

        const result = ValidationResult.fromItems(innerResults)

        return result
    }

    private async canCreateItems(items: (RequestItemGroup | RequestItem)[]) {
        const results: ValidationResult[] = []

        for (const requestItem of items) {
            if (requestItem instanceof RequestItem) {
                const canCreateItem = await this.canCreateItem(requestItem)
                results.push(canCreateItem)
            } else {
                const result = await this.canCreateItemGroup(requestItem)
                results.push(result)
            }
        }

        return results
    }

    private async canCreateItem(requestItem: RequestItem) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)
        return await processor.canCreateOutgoingRequestItem(requestItem)
    }

    private async canCreateItemGroup(requestItem: RequestItemGroup) {
        const innerResults: ValidationResult[] = []

        for (const innerRequestItem of requestItem.items) {
            const canCreateItem = await this.canCreateItem(innerRequestItem)
            innerResults.push(canCreateItem)
        }

        const result = ValidationResult.fromItems(innerResults)

        return result
    }

    public async create(params: ICreateOutgoingRequestParameters): Promise<ConsumptionRequest> {
        const parsedParams = await CreateOutgoingRequestParameters.from(params)

        const id = await ConsumptionIds.request.generate()
        parsedParams.content.id = id
        const consumptionRequest = await this._create(id, parsedParams.content, parsedParams.peer)

        return consumptionRequest
    }

    private async _create(id: CoreId, content: Request, peer: CoreAddress) {
        const canCreateResult = await this.canCreate({
            content,
            peer
        })

        if (canCreateResult.isError()) {
            throw new Error(canCreateResult.message)
        }

        const consumptionRequest = await ConsumptionRequest.from({
            id: id,
            content: content,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: peer,
            status: ConsumptionRequestStatus.Draft,
            statusLog: []
        })

        await this.consumptionRequests.create(consumptionRequest)
        return consumptionRequest
    }

    public async createFromRelationshipCreationChange(
        params: ICreateOutgoingRequestFromRelationshipCreationChangeParameters
    ): Promise<ConsumptionRequest> {
        const parsedParams = await CreateOutgoingRequestFromRelationshipCreationChangeParameters.from(params)

        const peer = parsedParams.creationChange.request.createdBy
        const id = (parsedParams.creationChange.request.content! as Response).requestId

        await this._create(id, parsedParams.template.cache!.content as Request, peer)

        await this._sent(id, parsedParams.template)

        const consumptionRequest = await this._complete(
            id,
            parsedParams.creationChange,
            parsedParams.creationChange.request.content! as Response
        )

        return consumptionRequest
    }

    public async sent(params: ISentOutgoingRequestParameters): Promise<ConsumptionRequest> {
        const parsedParams = await SentOutgoingRequestParameters.from(params)
        return await this._sent(parsedParams.requestId, parsedParams.requestSourceObject)
    }

    private async _sent(
        requestId: CoreId,
        requestSourceObject: Message | RelationshipTemplate
    ): Promise<ConsumptionRequest> {
        const request = await this.getOrThrow(requestId)

        this.assertRequestStatus(request, ConsumptionRequestStatus.Draft)

        request.changeStatus(ConsumptionRequestStatus.Open)

        request.source = await ConsumptionRequestSource.from({
            reference: requestSourceObject.id,
            type: this.getSourceType(requestSourceObject)
        })

        await this.update(request)
        return request
    }

    private getSourceType(sourceObject: Message | RelationshipTemplate): "Message" | "RelationshipTemplate" {
        if (sourceObject instanceof Message) {
            if (!sourceObject.isOwn) {
                throw new Error("Cannot create outgoing Request from a peer Message")
            }

            return "Message"
        } else if (sourceObject instanceof RelationshipTemplate) {
            if (!sourceObject.isOwn) {
                throw new Error("Cannot create outgoing Request from a peer Relationship Template")
            }

            return "RelationshipTemplate"
        }

        throw new Error(
            "The given sourceObject is not of a valid type. Valid types are 'Message' and 'RelationshipTemplate'."
        )
    }

    public async complete(params: ICompleteOugoingRequestParameters): Promise<ConsumptionRequest> {
        const parsedParams = await CompleteOugoingRequestParameters.from(params)
        return await this._complete(
            parsedParams.requestId,
            parsedParams.responseSourceObject,
            parsedParams.receivedResponse
        )
    }

    private async _complete(
        requestId: CoreId,
        responseSourceObject: Message | RelationshipChange,
        receivedResponse: Response
    ): Promise<ConsumptionRequest> {
        const request = await this.getOrThrow(requestId)

        this.assertRequestStatus(request, ConsumptionRequestStatus.Open)

        const canComplete = await this.canComplete(request, receivedResponse)

        if (canComplete.isError()) {
            throw new Error(canComplete.message)
        }

        await this.applyItems(request.content.items, receivedResponse.items)

        let responseSource: "Message" | "RelationshipChange"

        if (responseSourceObject instanceof Message) {
            responseSource = "Message"
        } else if (responseSourceObject instanceof RelationshipChange) {
            responseSource = "RelationshipChange"
        } else {
            throw new Error("Invalid responseSourceObject")
        }

        const consumptionResponse = await ConsumptionResponse.from({
            content: receivedResponse,
            createdAt: CoreDate.utc(),
            source: { reference: responseSourceObject.id, type: responseSource }
        })

        request.response = consumptionResponse
        request.changeStatus(ConsumptionRequestStatus.Completed)

        await this.update(request)

        return request
    }

    private async canComplete(request: ConsumptionRequest, receivedResponse: Response): Promise<ValidationResult> {
        for (let i = 0; i < receivedResponse.items.length; i++) {
            const requestItem = request.content.items[i]
            if (requestItem instanceof RequestItem) {
                const responseItem = receivedResponse.items[i] as ResponseItem
                const processor = this.processorRegistry.getProcessorForItem(requestItem)
                const canApplyItem = await processor.canApplyIncomingResponseItem(responseItem, requestItem)

                if (canApplyItem.isError()) {
                    return canApplyItem
                }
            } else if (requestItem instanceof RequestItemGroup) {
                const responseGroup = receivedResponse.items[i] as ResponseItemGroup

                for (let j = 0; j < requestItem.items.length; j++) {
                    const groupRequestItem = requestItem.items[j]
                    const groupResponseItem = responseGroup.items[j]

                    const processor = this.processorRegistry.getProcessorForItem(groupRequestItem)
                    const canApplyItem = await processor.canApplyIncomingResponseItem(
                        groupResponseItem,
                        groupRequestItem
                    )

                    if (canApplyItem.isError()) {
                        return canApplyItem
                    }
                }
            }
        }

        return ValidationResult.success()
    }

    private async applyItems(
        requestItems: (RequestItem | RequestItemGroup)[],
        responseItems: (ResponseItem | ResponseItemGroup)[]
    ): Promise<void> {
        for (let i = 0; i < responseItems.length; i++) {
            const requestItem = requestItems[i]
            if (requestItem instanceof RequestItem) {
                const responseItem = responseItems[i] as ResponseItem
                await this.applyItem(requestItem, responseItem)
            } else {
                const responseItemGroup = responseItems[i] as ResponseItemGroup
                await this.applyItems(requestItem.items, responseItemGroup.items)
            }
        }
    }

    private async applyItem(requestItem: RequestItem, responseItem: ResponseItem) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)
        await processor.applyIncomingResponseItem(responseItem, requestItem)
    }

    public async get(id: ICoreId): Promise<ConsumptionRequest | undefined> {
        const requestDoc = await this.consumptionRequests.findOne({ id: id.toString(), isOwn: true })
        const request = requestDoc ? await ConsumptionRequest.from(requestDoc) : undefined
        return request
    }

    private async getOrThrow(id: CoreId) {
        const request = await this.get(id)
        if (!request) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, id.toString())
        }
        return request
    }

    private async update(request: ConsumptionRequest) {
        const requestDoc = await this.consumptionRequests.findOne({ id: request.id.toString(), isOwn: true })
        if (!requestDoc) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, request.id.toString())
        }
        await this.consumptionRequests.update(requestDoc, request)
    }

    private assertRequestStatus(request: ConsumptionRequest, ...status: ConsumptionRequestStatus[]) {
        if (!status.includes(request.status)) {
            throw new Error(`Consumption Request has to be in status '${status.join("/")}'.`)
        }
    }
}
