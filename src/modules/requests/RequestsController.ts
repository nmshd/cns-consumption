import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import { Request, RequestItem, RequestItemGroup, Response, ResponseItem, ResponseItemGroup } from "@nmshd/content"
import { CoreDate, CoreId, Message, RelationshipTemplate } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import {
    CompleteRequestItemGroupParams,
    CompleteRequestItemParams,
    CompleteRequestParams,
    isCompleteRequestItemGroupParams,
    isCompleteRequestItemParams
} from "./CompleteRequestParams"
import { CompleteRequestParamsValidator } from "./CompleteRequestParamsValidator"
import { ConsumptionRequest, ConsumptionRequestStatus, ConsumptionResponseDraft } from "./local/ConsumptionRequest"
import { RequestItemProcessorRegistry } from "./RequestItemProcessorRegistry"

export class RequestsController extends ConsumptionBaseController {
    private requests: IDatabaseCollection
    private readonly completeRequestParamsValidator: CompleteRequestParamsValidator =
        new CompleteRequestParamsValidator()
    private readonly requestItemProcessorRegistry: RequestItemProcessorRegistry

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.RequestsController, parent)

        this.requestItemProcessorRegistry = new RequestItemProcessorRegistry()
    }

    public async init(): Promise<RequestsController> {
        await super.init()
        this.requests = await this.parent.accountController.getSynchronizedCollection("Requests")
        return this
    }

    public async createIncomingRequest(params: CreateRequestParams): Promise<ConsumptionRequest> {
        const info = this.extractInfoFromSource(params.source)

        const request = await ConsumptionRequest.from({
            id: await CoreId.generate(),
            createdAt: CoreDate.utc(),
            status: ConsumptionRequestStatus.Open,
            content: params.content,
            isOwn: info.isOwn,
            peer: info.peer,
            sourceReference: info.sourceReference,
            sourceType: info.sourceType,
            statusLog: []
        })

        await this.requests.create(request)

        return request
    }

    private extractInfoFromSource(source: Message | RelationshipTemplate) {
        if (source instanceof Message) {
            return this.extractInfoFromIncomingMessage(source)
        }

        return this.extractInfoFromIncomingRelationshipTemplate(source)
    }

    private extractInfoFromIncomingMessage(message: Message) {
        if (message.isOwn) throw new Error("Cannot create incoming Request from own Message")

        return {
            isOwn: this.parent.accountController.identity.isMe(message.cache!.createdBy),
            peer: message.cache!.createdBy,
            sourceReference: message.id,
            sourceType: "Message"
        }
    }

    private extractInfoFromIncomingRelationshipTemplate(template: RelationshipTemplate) {
        if (template.isOwn) throw new Error("Cannot create incoming Request from own Relationship Template")

        return {
            isOwn: this.parent.accountController.identity.isMe(template.cache!.createdBy),
            peer: template.cache!.createdBy,
            sourceReference: template.id,
            sourceType: "Relationship"
        }
    }

    public async get(id: CoreId): Promise<ConsumptionRequest | undefined> {
        const requestDoc = await this.requests.read(id.toString())
        const request = requestDoc ? await ConsumptionRequest.from(requestDoc) : undefined
        return request
    }

    public async accept(params: CompleteRequestParams): Promise<ConsumptionRequest> {
        const requestDoc = await this.requests.read(params.requestId.toString())
        const consumptionRequest = await ConsumptionRequest.from(requestDoc)

        const validationResult = this.completeRequestParamsValidator.validate(params, consumptionRequest)
        if (!validationResult.isSuccess) {
            throw new Error(validationResult.error.message)
        }

        const consumptionResponse = await this.createConsumptionResponse(params, consumptionRequest)

        consumptionRequest.response = consumptionResponse
        consumptionRequest.changeStatus(ConsumptionRequestStatus.Completed)

        await this.requests.update(requestDoc, consumptionRequest)

        return consumptionRequest
    }

    public async reject(params: CompleteRequestParams): Promise<ConsumptionRequest> {
        const requestDoc = await this.requests.read(params.requestId.toString())
        const consumptionRequest = await ConsumptionRequest.from(requestDoc)

        const validationResult = this.completeRequestParamsValidator.validate(params, consumptionRequest)
        if (!validationResult.isSuccess) {
            throw new Error(validationResult.error.message)
        }

        const consumptionResponse = await this.createConsumptionResponse(params, consumptionRequest)

        consumptionRequest.response = consumptionResponse
        consumptionRequest.changeStatus(ConsumptionRequestStatus.Completed)

        await this.requests.update(requestDoc, consumptionRequest)

        return consumptionRequest
    }

    private async createConsumptionResponse(params: CompleteRequestParams, request: ConsumptionRequest) {
        const requestItems = request.content.items
        const responseItems = await this.createResponseItems(params.items, requestItems)

        const response = await Response.from({
            requestId: request.id,
            items: responseItems
        })

        const consumptionResponse = await ConsumptionResponseDraft.from({
            content: response,
            createdAt: CoreDate.utc()
        })

        return consumptionResponse
    }

    private async createResponseItems(
        params: (CompleteRequestItemParams | CompleteRequestItemGroupParams)[],
        requestItems: (RequestItemGroup | RequestItem)[]
    ) {
        const responseItems: (ResponseItem | ResponseItemGroup)[] = []

        for (let i = 0; i < params.length; i++) {
            const itemParam = params[i]

            if (isCompleteRequestItemParams(itemParam)) {
                responseItems.push(await this.createResponseItem(itemParam, requestItems[i] as RequestItem))
            } else if (isCompleteRequestItemGroupParams(itemParam)) {
                responseItems.push(await this.createResponseItemGroup(itemParam, requestItems[i] as RequestItemGroup))
            }
        }
        return responseItems
    }

    private async createResponseItem(
        params: CompleteRequestItemParams,
        requestItem: RequestItem
    ): Promise<ResponseItem> {
        const processor = this.requestItemProcessorRegistry.getProcessorForItem(requestItem)
        return await processor.complete(requestItem, params)
    }

    private async createResponseItemGroup(
        groupItemParam: CompleteRequestItemGroupParams,
        requestItemGroup: RequestItemGroup
    ) {
        const items = (await this.createResponseItems(groupItemParam.items, requestItemGroup.items)) as ResponseItem[]

        const group = await ResponseItemGroup.from({
            items: items,
            metadata: requestItemGroup.responseMetadata
        })
        return group
    }

    // private extractInfoFromRelationship(relationship: Relationship) {
    //     return {
    //         isOwn:
    //     }
    // }

    // public async createRequest(request: Request, message: Message): Promise<ConsumptionRequestOld> {
    //     if (request.id) {
    //         const availableRequest = await this.getRequest(request.id)
    //         if (availableRequest) {
    //             throw ConsumptionErrors.requests.requestsExists(request.id.toString()).logWith(this._log)
    //         }
    //     } else {
    //         request.id = await ConsumptionIds.request.generate()
    //     }

    //     const isOwn = this.parent.accountController.identity.isMe(message.cache!.createdBy)
    //     return await ConsumptionRequestOld.from({
    //         id: request.id,
    //         isOwn: isOwn,
    //         isPending: false,
    //         requestMessage: message.id,
    //         status: ConsumptionRequestStatusOld.Pending
    //     })
    // }

    // public async getRequest(id: CoreId): Promise<ConsumptionRequestOld | undefined> {
    //     const result = await this.requests.findOne({ id: id.toString() })
    //     return result ? await ConsumptionRequestOld.from(result) : undefined
    // }

    // public async getRequests(query?: any): Promise<ConsumptionRequestOld[]> {
    //     const items = await this.requests.find(query)
    //     return await this.parseArray<ConsumptionRequestOld>(items, ConsumptionRequestOld)
    // }

    // public async getPendingRequests(query?: any): Promise<ConsumptionRequestOld[]> {
    //     query.isProcessed = false
    //     return await this.getRequests(query)
    // }

    // private async updateRequestWithStatus(
    //     requestId: CoreId,
    //     messageId: CoreId,
    //     status: ConsumptionRequestStatusOld
    // ): Promise<ConsumptionRequestOld> {
    //     const current = await this.requests.findOne({ id: requestId.toString() })
    //     if (!current) {
    //         throw TransportErrors.general.recordNotFound(ConsumptionRequestOld, requestId.toString())
    //     }
    //     const request = await ConsumptionRequestOld.from(current)
    //     request.responseMessage = messageId
    //     request.isPending = false
    //     request.status = status
    //     await this.requests.update(current, request)
    //     return request
    // }

    // public async acceptRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequestOld> {
    //     return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatusOld.Accepted)
    // }

    // public async rejectRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequestOld> {
    //     return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatusOld.Rejected)
    // }

    // public async revokeRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequestOld> {
    //     return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatusOld.Revoked)
    // }

    // public async updateRequest(request: ConsumptionRequestOld): Promise<ConsumptionRequestOld> {
    //     const current = await this.requests.findOne({ id: request.id.toString() })
    //     if (!current) {
    //         throw TransportErrors.general.recordNotFound(ConsumptionRequestOld, request.id.toString())
    //     }
    //     await this.requests.update(current, request)
    //     return request
    // }

    // public async deleteRequest(request: ConsumptionRequestOld): Promise<void> {
    //     await this.requests.delete(request)
    // }
}

export interface CreateRequestParams {
    // id?: CoreId
    content: Request
    source: Message | RelationshipTemplate
}
