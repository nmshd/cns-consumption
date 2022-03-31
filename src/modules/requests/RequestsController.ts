import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import { ISerializable, Serializable, type } from "@js-soft/ts-serval"
import {
    IRequest,
    IResponse,
    Request,
    RequestItem,
    RequestItemGroup,
    Response,
    ResponseItem,
    ResponseItemGroup,
    ResponseResult
} from "@nmshd/content"
import { CoreDate, CoreId, ICoreAddress, ICoreId, Message, RelationshipTemplate } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import {
    CreateIncomingRequestParameters,
    ICreateIncomingRequestParameters
} from "./createIncomingRequestParameters/CreateIncomingRequestParameters"
import { AcceptRequestParameters, IAcceptRequestParameters } from "./decideRequestParameters/AcceptRequestParameters"
import {
    DecideRequestItemGroupParameters,
    IDecideRequestItemGroupParameters
} from "./decideRequestParameters/DecideRequestItemGroupParameters"
import {
    DecideRequestItemParameters,
    IDecideRequestItemParameters
} from "./decideRequestParameters/DecideRequestItemParameters"
import { DecideRequestParameters } from "./decideRequestParameters/DecideRequestParameters"
import { IRejectRequestParameters, RejectRequestParameters } from "./decideRequestParameters/RejectRequestParameters"
import { DecideRequestParamsValidator } from "./DecideRequestParamsValidator"
import { ConsumptionRequest } from "./local/ConsumptionRequest"
import { ConsumptionRequestStatus } from "./local/ConsumptionRequestStatus"
import { ConsumptionResponse } from "./local/ConsumptionResponse"
import { RequestItemProcessorRegistry } from "./RequestItemProcessorRegistry"

export interface ICreateOutgoingRequestParameters extends ISerializable {
    content: Omit<IRequest, "id">
    peer: ICoreAddress
}

@type("CreateOutgoingRequestParameters")
export class CreateOutgoingRequestParameters extends Serializable implements ICreateOutgoingRequestParameters {
    public source: Message
    public content: Omit<Request, "id">
    public peer: ICoreAddress
}

export class RequestsController extends ConsumptionBaseController {
    private consumptionRequests: IDatabaseCollection
    private readonly decideRequestParamsValidator: DecideRequestParamsValidator = new DecideRequestParamsValidator()
    private readonly requestItemProcessorRegistry: RequestItemProcessorRegistry

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.RequestsController, parent)

        this.requestItemProcessorRegistry = new RequestItemProcessorRegistry()
    }

    public async init(): Promise<RequestsController> {
        await super.init()
        this.consumptionRequests = await this.parent.accountController.getSynchronizedCollection("Requests")
        return this
    }

    public async createIncomingRequest(params: ICreateIncomingRequestParameters): Promise<ConsumptionRequest> {
        params = CreateIncomingRequestParameters.from(params)

        const infoFromSource = this.extractInfoFromSource(params.source)

        const consumptionRequest = await ConsumptionRequest.from({
            id: params.content.id ? CoreId.from(params.content.id) : await CoreId.generate(),
            createdAt: CoreDate.utc(),
            status: ConsumptionRequestStatus.Open,
            content: params.content,
            isOwn: infoFromSource.isOwn,
            peer: infoFromSource.peer,
            source: { reference: infoFromSource.sourceReference, type: infoFromSource.sourceType },
            statusLog: []
        })

        await this.consumptionRequests.create(consumptionRequest)

        return consumptionRequest
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

    public async incomingRequestAnswered(id: ICoreId): Promise<ConsumptionRequest> {
        const requestDoc = await this.consumptionRequests.read(id.toString())
        const request = await ConsumptionRequest.from(requestDoc)

        if (request.isOwn) {
            throw new Error("Cannot decide own Request")
        }

        if (request.status !== ConsumptionRequestStatus.Decided) {
            throw new Error(`Can only decide Request in status '${ConsumptionRequestStatus.Decided}'`)
        }

        request.changeStatus(ConsumptionRequestStatus.Answered)

        await this.consumptionRequests.update(requestDoc, request)

        return request
    }

    public async createOutgoingRequest(params: ICreateOutgoingRequestParameters): Promise<ConsumptionRequest> {
        const consumptionRequestId = await ConsumptionIds.request.generate()

        const request = await Request.from({ id: consumptionRequestId, ...params.content })

        const consumptionRequest = await ConsumptionRequest.from({
            id: consumptionRequestId,
            content: request,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: params.peer,
            status: ConsumptionRequestStatus.Draft,
            statusLog: []
        })

        await this.consumptionRequests.create(consumptionRequest)

        return consumptionRequest
    }

    public async responseForOutgoingRequestReceived(
        requestId: ICoreId,
        source: Message,
        response: IResponse
    ): Promise<ConsumptionRequest> {
        const requestDoc = await this.consumptionRequests.read(requestId.toString())
        const request = await ConsumptionRequest.from(requestDoc)

        const consumptionResponse = await ConsumptionResponse.from({
            content: response,
            createdAt: CoreDate.utc(),
            source: { reference: source.id, type: "Message" }
        })

        request.response = consumptionResponse

        request.changeStatus(ConsumptionRequestStatus.Answered)

        await this.consumptionRequests.update(requestDoc, request)

        return request
    }

    public async get(id: ICoreId): Promise<ConsumptionRequest | undefined> {
        const requestDoc = await this.consumptionRequests.read(id.toString())
        const request = requestDoc ? await ConsumptionRequest.from(requestDoc) : undefined
        return request
    }

    public async accept(params: IAcceptRequestParameters): Promise<ConsumptionRequest> {
        return await this.decide(AcceptRequestParameters.from(params))
    }

    public async reject(params: IRejectRequestParameters): Promise<ConsumptionRequest> {
        return await this.decide(RejectRequestParameters.from(params))
    }

    private async decide(params: DecideRequestParameters) {
        const requestDoc = await this.consumptionRequests.read(params.requestId.toString())
        const consumptionRequest = await ConsumptionRequest.from(requestDoc)

        const validationResult = this.decideRequestParamsValidator.validate(params, consumptionRequest)
        if (!validationResult.isSuccess) {
            throw new Error(validationResult.error.message)
        }

        const consumptionResponse = await this.createConsumptionResponse(params, consumptionRequest)

        consumptionRequest.response = consumptionResponse
        consumptionRequest.changeStatus(ConsumptionRequestStatus.Decided)

        await this.consumptionRequests.update(requestDoc, consumptionRequest)

        return consumptionRequest
    }

    private async createConsumptionResponse(
        params: AcceptRequestParameters | RejectRequestParameters,
        request: ConsumptionRequest
    ) {
        const requestItems = request.content.items
        const responseItems = await this.createResponseItems(params.items, requestItems)

        const response = await Response.from({
            result: params instanceof AcceptRequestParameters ? ResponseResult.Accepted : ResponseResult.Rejected,
            requestId: request.id,
            items: responseItems
        })

        const consumptionResponse = await ConsumptionResponse.from({
            content: response,
            createdAt: CoreDate.utc()
        })

        return consumptionResponse
    }

    private async createResponseItems(
        params: (IDecideRequestItemParameters | IDecideRequestItemGroupParameters)[],
        requestItems: (RequestItemGroup | RequestItem)[]
    ) {
        const responseItems: (ResponseItem | ResponseItemGroup)[] = []

        for (let i = 0; i < params.length; i++) {
            const itemParam = params[i]

            if (itemParam instanceof DecideRequestItemParameters) {
                responseItems.push(await this.createResponseItem(itemParam, requestItems[i] as RequestItem))
            } else if (itemParam instanceof DecideRequestItemGroupParameters) {
                responseItems.push(await this.createResponseItemGroup(itemParam, requestItems[i] as RequestItemGroup))
            }
        }
        return responseItems
    }

    private async createResponseItem(
        params: DecideRequestItemParameters,
        requestItem: RequestItem
    ): Promise<ResponseItem> {
        const processor = this.requestItemProcessorRegistry.getProcessorForItem(requestItem)
        return await processor.processDecision(requestItem, params)
    }

    private async createResponseItemGroup(
        groupItemParam: DecideRequestItemGroupParameters,
        requestItemGroup: RequestItemGroup
    ) {
        const items = (await this.createResponseItems(groupItemParam.items, requestItemGroup.items)) as ResponseItem[]

        const group = await ResponseItemGroup.from({
            items: items,
            metadata: requestItemGroup.responseMetadata
        })
        return group
    }

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
