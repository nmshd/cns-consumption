import { Request } from "@nmshd/content"
import { CoreId, Message, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import {
    ConsumptionBaseController,
    ConsumptionControllerName,
    ConsumptionErrors,
    ConsumptionIds
} from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ConsumptionRequest, ConsumptionRequestStatus } from "./local/ConsumptionRequest"

export class RequestsController extends ConsumptionBaseController {
    private requests: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.RequestsController, parent)
    }

    public async init(): Promise<RequestsController> {
        await super.init()

        this.requests = await this.parent.accountController.getSynchronizedCollection("Requests")

        return this
    }

    public async getRequest(id: CoreId): Promise<ConsumptionRequest | undefined> {
        const result = await this.requests.findOne({ id: id.toString() })
        return result ? await ConsumptionRequest.from(result) : undefined
    }

    public async getRequests(query?: any): Promise<ConsumptionRequest[]> {
        const items = await this.requests.find(query)
        return await this.parseArray<ConsumptionRequest>(items, ConsumptionRequest)
    }

    public async getPendingRequests(query?: any): Promise<ConsumptionRequest[]> {
        query.isProcessed = false
        return await this.getRequests(query)
    }

    public async createRequest(request: Request, message: Message): Promise<ConsumptionRequest> {
        if (request.id) {
            const availableRequest = await this.getRequest(request.id)
            if (availableRequest) {
                throw ConsumptionErrors.requests.requestsExists(request.id.toString()).logWith(this._log)
            }
        } else {
            request.id = await ConsumptionIds.request.generate()
        }

        const isOwn = this.parent.accountController.identity.isMe(message.cache!.createdBy)
        return await ConsumptionRequest.from({
            id: request.id,
            isOwn: isOwn,
            isPending: false,
            requestMessage: message.id,
            status: ConsumptionRequestStatus.Pending
        })
    }

    private async updateRequestWithStatus(
        requestId: CoreId,
        messageId: CoreId,
        status: ConsumptionRequestStatus
    ): Promise<ConsumptionRequest> {
        const current = await this.requests.findOne({ id: requestId.toString() })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, requestId.toString())
        }
        const request = await ConsumptionRequest.from(current)
        request.responseMessage = messageId
        request.isPending = false
        request.status = status
        await this.requests.update(current, request)
        return request
    }

    public async acceptRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequest> {
        return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatus.Accepted)
    }

    public async rejectRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequest> {
        return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatus.Rejected)
    }

    public async revokeRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequest> {
        return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatus.Revoked)
    }

    public async updateRequest(request: ConsumptionRequest): Promise<ConsumptionRequest> {
        const current = await this.requests.findOne({ id: request.id.toString() })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, request.id.toString())
        }
        await this.requests.update(current, request)
        return request
    }

    public async deleteRequest(request: ConsumptionRequest): Promise<void> {
        await this.requests.delete(request)
    }
}
