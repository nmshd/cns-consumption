import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import { IResponse, RequestItem, RequestItemGroup } from "@nmshd/content"
import { CoreDate, ICoreId, Message, RelationshipTemplate, TransportErrors } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry"
import { ValidationResult } from "../itemProcessors/ValidationResult"
import { ConsumptionRequest, ConsumptionRequestSource } from "../local/ConsumptionRequest"
import { ConsumptionRequestStatus } from "../local/ConsumptionRequestStatus"
import { ConsumptionResponse } from "../local/ConsumptionResponse"
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

        const innerResults = await this.canCreateItems(parsedParams)

        const result = ValidationResult.fromItems(innerResults)

        return result
    }

    private async canCreateItems(parsedParams: CreateOutgoingRequestParameters) {
        const results: ValidationResult[] = []

        for (const requestItem of parsedParams.request.items) {
            if (requestItem instanceof RequestItem) {
                const canCreateItem = await this.canCreateRequestItem(requestItem)
                results.push(canCreateItem)
            } else {
                const result = await this.canCreateRequestItemGroup(requestItem)
                results.push(result)
            }
        }

        return results
    }

    private async canCreateRequestItem(requestItem: RequestItem) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)
        return await processor.canCreateOutgoingRequestItem(requestItem)
    }

    private async canCreateRequestItemGroup(requestItem: RequestItemGroup) {
        const innerResults: ValidationResult[] = []

        for (const innerRequestItem of requestItem.items) {
            const canCreateItem = await this.canCreateRequestItem(innerRequestItem)
            innerResults.push(canCreateItem)
        }

        const result = ValidationResult.fromItems(innerResults)

        return result
    }

    public async create(params: ICreateOutgoingRequestParameters): Promise<ConsumptionRequest> {
        const parsedParams = await CreateOutgoingRequestParameters.from(params)

        const canCreateResult = await this.canCreate(parsedParams)
        if (canCreateResult.isError()) {
            throw new Error(canCreateResult.message)
        }

        const id = await ConsumptionIds.request.generate()

        parsedParams.request.id = id

        const consumptionRequest = await ConsumptionRequest.from({
            id: id,
            content: parsedParams.request,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: parsedParams.peer,
            status: ConsumptionRequestStatus.Draft,
            statusLog: []
        })

        await this.consumptionRequests.create(consumptionRequest)

        return consumptionRequest
    }

    public async sent(params: ISentOutgoingRequestParameters): Promise<any> {
        const parsedParams = await SentOutgoingRequestParameters.from(params)

        const request = await this.getOrThrow(params.requestId)

        if (request.status !== ConsumptionRequestStatus.Draft) {
            throw new Error("Consumption Request has to be in status 'Draft'.")
        }

        request.changeStatus(ConsumptionRequestStatus.Open)

        request.source = await ConsumptionRequestSource.from({
            reference: parsedParams.sourceObject.id,
            type: this.getSourceType(parsedParams.sourceObject)
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

    public async complete(requestId: ICoreId, source: Message, response: IResponse): Promise<ConsumptionRequest> {
        const requestDoc = await this.consumptionRequests.read(requestId.toString())
        const request = await ConsumptionRequest.from(requestDoc)

        const consumptionResponse = await ConsumptionResponse.from({
            content: response,
            createdAt: CoreDate.utc(),
            source: { reference: source.id, type: "Message" }
        })

        request.response = consumptionResponse

        request.changeStatus(ConsumptionRequestStatus.Completed)

        await this.consumptionRequests.update(requestDoc, request)

        return request
    }

    public async get(id: ICoreId): Promise<ConsumptionRequest | undefined> {
        const requestDoc = await this.consumptionRequests.findOne({ id: id.toString(), isOwn: true })
        const request = requestDoc ? await ConsumptionRequest.from(requestDoc) : undefined
        return request
    }

    private async getOrThrow(id: ICoreId) {
        const requestDoc = await this.consumptionRequests.findOne({ id: id.toString(), isOwn: true })
        if (!requestDoc) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, id.toString())
        }
        const request = await ConsumptionRequest.from(requestDoc)
        return request
    }

    private async update(request: ConsumptionRequest) {
        const requestDoc = await this.consumptionRequests.findOne({ id: request.id.toString(), isOwn: true })
        if (!requestDoc) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, request.id.toString())
        }
        await this.consumptionRequests.update(requestDoc, request)
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
