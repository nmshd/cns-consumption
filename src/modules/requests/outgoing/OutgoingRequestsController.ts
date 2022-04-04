import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import { ISerializable, Serializable, type } from "@js-soft/ts-serval"
import { IRequest, IResponse, Request } from "@nmshd/content"
import { CoreDate, ICoreAddress, ICoreId, Message } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { ConsumptionRequestStatus } from "../local/ConsumptionRequestStatus"
import { ConsumptionResponse } from "../local/ConsumptionResponse"

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

export class OutgoingRequestsController extends ConsumptionBaseController {
    private consumptionRequests: IDatabaseCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.RequestsController, parent)
    }

    public async init(): Promise<OutgoingRequestsController> {
        await super.init()
        this.consumptionRequests = await this.parent.accountController.getSynchronizedCollection("Requests")
        return this
    }

    public async createOutgoingRequest(params: ICreateOutgoingRequestParameters): Promise<ConsumptionRequest> {
        const consumptionRequestId = await ConsumptionIds.request.generate()

        const request = await Request.from({ id: consumptionRequestId, ...params.content })

        const consumptionRequest = await ConsumptionRequest.from({
            id: consumptionRequestId,
            content: request,
            createdAt: CoreDate.utc(),
            isOwn: true,
            status: ConsumptionRequestStatus.Draft,
            statusLog: []
        })

        await this.consumptionRequests.create(consumptionRequest)

        return consumptionRequest
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
