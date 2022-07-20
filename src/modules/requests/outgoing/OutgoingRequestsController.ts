import {
    RelationshipCreationChangeRequestBody,
    RelationshipTemplateBody,
    Request,
    RequestItem,
    RequestItemGroup,
    Response,
    ResponseItem,
    ResponseItemGroup
} from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    ICoreId,
    Message,
    RelationshipChange,
    RelationshipTemplate,
    SynchronizedCollection,
    TransportErrors
} from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import {
    OutgoingRequestCreatedEvent,
    OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent,
    OutgoingRequestStatusChangedEvent
} from "../events"
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry"
import { ValidationResult } from "../itemProcessors/ValidationResult"
import { LocalRequest, LocalRequestSource } from "../local/LocalRequest"
import { LocalRequestStatus } from "../local/LocalRequestStatus"
import { LocalResponse } from "../local/LocalResponse"
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
    public constructor(
        private readonly localRequests: SynchronizedCollection,
        private readonly processorRegistry: RequestItemProcessorRegistry,
        parent: ConsumptionController
    ) {
        super(ConsumptionControllerName.RequestsController, parent)
    }

    public async canCreate(params: ICreateOutgoingRequestParameters): Promise<ValidationResult> {
        const parsedParams = CreateOutgoingRequestParameters.from(params)

        const innerResults = await this.canCreateItems(parsedParams.content, parsedParams.peer)

        const result = ValidationResult.fromItems(innerResults)

        return result
    }

    private async canCreateItems(request: Request, recipient: CoreAddress) {
        const results: ValidationResult[] = []

        for (const requestItem of request.items) {
            if (requestItem instanceof RequestItem) {
                const canCreateItem = await this.canCreateItem(requestItem, request, recipient)
                results.push(canCreateItem)
            } else {
                const result = await this.canCreateItemGroup(requestItem, request, recipient)
                results.push(result)
            }
        }

        return results
    }

    private async canCreateItem(requestItem: RequestItem, request: Request, recipient: CoreAddress) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)
        return await processor.canCreateOutgoingRequestItem(requestItem, request, recipient)
    }

    private async canCreateItemGroup(requestItem: RequestItemGroup, request: Request, recipient: CoreAddress) {
        const innerResults: ValidationResult[] = []

        for (const innerRequestItem of requestItem.items) {
            const canCreateItem = await this.canCreateItem(innerRequestItem, request, recipient)
            innerResults.push(canCreateItem)
        }

        const result = ValidationResult.fromItems(innerResults)

        return result
    }

    public async create(params: ICreateOutgoingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CreateOutgoingRequestParameters.from(params)

        const id = await ConsumptionIds.request.generate()
        parsedParams.content.id = id
        const request = await this._create(id, parsedParams.content, parsedParams.peer)

        this.eventBus.publish(new OutgoingRequestCreatedEvent(this.identity.address.toString(), request))

        return request
    }

    private async _create(id: CoreId, content: Request, peer: CoreAddress) {
        const canCreateResult = await this.canCreate({
            content,
            peer
        })

        if (canCreateResult.isError()) {
            throw canCreateResult.error
        }

        const request = LocalRequest.from({
            id: id,
            content: content,
            createdAt: CoreDate.utc(),
            isOwn: true,
            peer: peer,
            status: LocalRequestStatus.Draft,
            statusLog: []
        })

        await this.localRequests.create(request)
        return request
    }

    public async createFromRelationshipCreationChange(
        params: ICreateOutgoingRequestFromRelationshipCreationChangeParameters
    ): Promise<LocalRequest> {
        const parsedParams = CreateOutgoingRequestFromRelationshipCreationChangeParameters.from(params)

        const peer = parsedParams.creationChange.request.createdBy

        const requestBody = parsedParams.creationChange.request.content!
        if (!(requestBody instanceof RelationshipCreationChangeRequestBody)) {
            throw new Error(
                "the body of the request is not supported as is is not type of RelationshipCreationChangeRequestBody"
            )
        }
        const receivedResponse = requestBody.response
        const id = receivedResponse.requestId

        const templateContent = parsedParams.template.cache!.content
        if (!(templateContent instanceof RelationshipTemplateBody)) {
            throw new Error("the body of the template is not supported as is is not type of RelationshipTemplateBody")
        }

        // TODO: is this the correct request (=> could be RelationshipTemplateBody#existingRelationshipRequest)
        await this._create(id, templateContent.onNewRelationship, peer)

        await this._sent(id, parsedParams.template)

        const request = await this._complete(id, parsedParams.creationChange, receivedResponse)

        this.eventBus.publish(
            new OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent(
                this.identity.address.toString(),
                request
            )
        )

        return request
    }

    public async sent(params: ISentOutgoingRequestParameters): Promise<LocalRequest> {
        const parsedParams = SentOutgoingRequestParameters.from(params)
        const request = await this._sent(parsedParams.requestId, parsedParams.requestSourceObject)

        this.eventBus.publish(
            new OutgoingRequestStatusChangedEvent(this.identity.address.toString(), {
                request: request,
                oldStatus: LocalRequestStatus.Draft,
                newStatus: request.status
            })
        )

        return request
    }

    private async _sent(requestId: CoreId, requestSourceObject: Message | RelationshipTemplate): Promise<LocalRequest> {
        const request = await this.getOrThrow(requestId)

        this.assertRequestStatus(request, LocalRequestStatus.Draft)

        request.changeStatus(LocalRequestStatus.Open)

        request.source = LocalRequestSource.from({
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

    public async complete(params: ICompleteOugoingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CompleteOugoingRequestParameters.from(params)
        const request = await this._complete(
            parsedParams.requestId,
            parsedParams.responseSourceObject,
            parsedParams.receivedResponse
        )

        this.eventBus.publish(
            new OutgoingRequestStatusChangedEvent(this.identity.address.toString(), {
                request,
                oldStatus: LocalRequestStatus.Open,
                newStatus: request.status
            })
        )

        return request
    }

    private async _complete(
        requestId: CoreId,
        responseSourceObject: Message | RelationshipChange,
        receivedResponse: Response
    ): Promise<LocalRequest> {
        const request = await this.getOrThrow(requestId)

        this.assertRequestStatus(request, LocalRequestStatus.Open)

        const canComplete = await this.canComplete(request, receivedResponse)

        if (canComplete.isError()) {
            throw canComplete.error
        }

        await this.applyItems(request.content.items, receivedResponse.items, request)

        let responseSource: "Message" | "RelationshipChange"

        if (responseSourceObject instanceof Message) {
            responseSource = "Message"
        } else if (responseSourceObject instanceof RelationshipChange) {
            responseSource = "RelationshipChange"
        } else {
            throw new Error("Invalid responseSourceObject")
        }

        const localResponse = LocalResponse.from({
            content: receivedResponse,
            createdAt: CoreDate.utc(),
            source: { reference: responseSourceObject.id, type: responseSource }
        })

        request.response = localResponse
        request.changeStatus(LocalRequestStatus.Completed)

        await this.update(request)

        return request
    }

    private async canComplete(request: LocalRequest, receivedResponse: Response): Promise<ValidationResult> {
        for (let i = 0; i < receivedResponse.items.length; i++) {
            const requestItem = request.content.items[i]
            if (requestItem instanceof RequestItem) {
                const responseItem = receivedResponse.items[i] as ResponseItem
                const processor = this.processorRegistry.getProcessorForItem(requestItem)
                const canApplyItem = await processor.canApplyIncomingResponseItem(responseItem, requestItem, request)

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
                        groupRequestItem,
                        request
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
        responseItems: (ResponseItem | ResponseItemGroup)[],
        request: LocalRequest
    ): Promise<void> {
        for (let i = 0; i < responseItems.length; i++) {
            const requestItem = requestItems[i]
            if (requestItem instanceof RequestItem) {
                const responseItem = responseItems[i] as ResponseItem
                await this.applyItem(requestItem, responseItem, request)
            } else {
                const responseItemGroup = responseItems[i] as ResponseItemGroup
                await this.applyItems(requestItem.items, responseItemGroup.items, request)
            }
        }
    }

    private async applyItem(requestItem: RequestItem, responseItem: ResponseItem, request: LocalRequest) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)
        await processor.applyIncomingResponseItem(responseItem, requestItem, request)
    }

    public async getOutgoingRequests(query?: any): Promise<LocalRequest[]> {
        query ??= {}
        query.isOwn = true

        const requestDocs = await this.localRequests.find(query)

        const requests = requestDocs.map((r) => LocalRequest.from(r))
        return requests
    }

    public async getOutgoingRequest(id: ICoreId): Promise<LocalRequest | undefined> {
        const requestDoc = await this.localRequests.findOne({ id: id.toString(), isOwn: true })
        const request = requestDoc ? LocalRequest.from(requestDoc) : undefined
        return request
    }

    private async getOrThrow(id: CoreId) {
        const request = await this.getOutgoingRequest(id)
        if (!request) {
            throw TransportErrors.general.recordNotFound(LocalRequest, id.toString())
        }
        return request
    }

    private async update(request: LocalRequest) {
        const requestDoc = await this.localRequests.findOne({ id: request.id.toString(), isOwn: true })
        if (!requestDoc) {
            throw TransportErrors.general.recordNotFound(LocalRequest, request.id.toString())
        }
        await this.localRequests.update(requestDoc, request)
    }

    private assertRequestStatus(request: LocalRequest, ...status: LocalRequestStatus[]) {
        if (!status.includes(request.status)) {
            throw new Error(`Local Request has to be in status '${status.join("/")}'.`)
        }
    }
}
