import { Request } from "@nmshd/content"
import { CoreId, Message, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import {
    ConsumptionBaseController,
    ConsumptionControllerName,
    ConsumptionErrors,
    ConsumptionIds
} from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ConsumptionRequestOld, ConsumptionRequestStatusOld } from "./local/ConsumptionRequestOld"

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

    public async getRequest(id: CoreId): Promise<ConsumptionRequestOld | undefined> {
        const result = await this.requests.findOne({ id: id.toString() })
        return result ? await ConsumptionRequestOld.from(result) : undefined
    }

    public async getRequests(query?: any): Promise<ConsumptionRequestOld[]> {
        const items = await this.requests.find(query)
        return await this.parseArray<ConsumptionRequestOld>(items, ConsumptionRequestOld)
    }

    public async getPendingRequests(query?: any): Promise<ConsumptionRequestOld[]> {
        query.isProcessed = false
        return await this.getRequests(query)
    }

    public async createRequest(request: Request, message: Message): Promise<ConsumptionRequestOld> {
        if (request.id) {
            const availableRequest = await this.getRequest(request.id)
            if (availableRequest) {
                throw ConsumptionErrors.requests.requestsExists(request.id.toString()).logWith(this._log)
            }
        } else {
            request.id = await ConsumptionIds.request.generate()
        }

        const isOwn = this.parent.accountController.identity.isMe(message.cache!.createdBy)
        return await ConsumptionRequestOld.from({
            id: request.id,
            isOwn: isOwn,
            isPending: false,
            requestMessage: message.id,
            status: ConsumptionRequestStatusOld.Pending
        })
    }

    private async updateRequestWithStatus(
        requestId: CoreId,
        messageId: CoreId,
        status: ConsumptionRequestStatusOld
    ): Promise<ConsumptionRequestOld> {
        const current = await this.requests.findOne({ id: requestId.toString() })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequestOld, requestId.toString())
        }
        const request = await ConsumptionRequestOld.from(current)
        request.responseMessage = messageId
        request.isPending = false
        request.status = status
        await this.requests.update(current, request)
        return request
    }

    public async acceptRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequestOld> {
        return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatusOld.Accepted)
    }

    public async rejectRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequestOld> {
        return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatusOld.Rejected)
    }

    public async revokeRequest(requestId: CoreId, messageId: CoreId): Promise<ConsumptionRequestOld> {
        return await this.updateRequestWithStatus(requestId, messageId, ConsumptionRequestStatusOld.Revoked)
    }

    public async updateRequest(request: ConsumptionRequestOld): Promise<ConsumptionRequestOld> {
        const current = await this.requests.findOne({ id: request.id.toString() })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequestOld, request.id.toString())
        }
        await this.requests.update(current, request)
        return request
    }

    public async deleteRequest(request: ConsumptionRequestOld): Promise<void> {
        await this.requests.delete(request)
    }
}
