import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import { RequestItem, RequestItemGroup, ResponseItem, ResponseItemGroup } from "@nmshd/content"
import {
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

        parsedParams.content.id = id

        const consumptionRequest = await ConsumptionRequest.from({
            id: id,
            content: parsedParams.content,
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

        const request = await this.getOrThrow(parsedParams.requestId)

        if (request.status !== ConsumptionRequestStatus.Draft) {
            throw new Error("Consumption Request has to be in status 'Draft'.")
        }

        request.changeStatus(ConsumptionRequestStatus.Open)

        request.source = await ConsumptionRequestSource.from({
            reference: parsedParams.requestSourceObject.id,
            type: this.getSourceType(parsedParams.requestSourceObject)
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

        const request = await this.getOrThrow(parsedParams.requestId)

        if (request.status !== ConsumptionRequestStatus.Open) {
            throw new Error("Consumption Request has to be in status 'Open'.")
        }

        const canComplete = await this.canComplete(request, parsedParams)

        if (canComplete.isError()) {
            throw new Error(canComplete.message)
        }

        await this.applyItems(request, parsedParams)

        let responseSource: "Message" | "RelationshipChange"

        if (parsedParams.responseSourceObject instanceof Message) {
            responseSource = "Message"
        } else if (parsedParams.responseSourceObject instanceof RelationshipChange) {
            responseSource = "RelationshipChange"
        } else {
            throw new Error("Invalid responseSourceObject")
        }

        const consumptionResponse = await ConsumptionResponse.from({
            content: parsedParams.receivedResponse,
            createdAt: CoreDate.utc(),
            source: { reference: parsedParams.responseSourceObject.id, type: responseSource }
        })

        request.response = consumptionResponse
        request.changeStatus(ConsumptionRequestStatus.Completed)

        await this.update(request)

        return request
    }

    private async canComplete(
        request: ConsumptionRequest,
        params: CompleteOugoingRequestParameters
    ): Promise<ValidationResult> {
        for (let i = 0; i < params.receivedResponse.items.length; i++) {
            const requestItem = request.content.items[i]
            if (requestItem instanceof RequestItem) {
                const responseItem = params.receivedResponse.items[i] as ResponseItem
                const processor = this.processorRegistry.getProcessorForItem(requestItem)
                const canApplyItem = await processor.canApplyIncomingResponseItem(responseItem, requestItem)

                if (canApplyItem.isError()) {
                    return canApplyItem
                }
            } else if (requestItem instanceof RequestItemGroup) {
                const responseGroup = params.receivedResponse.items[i] as ResponseItemGroup

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
        request: ConsumptionRequest,
        params: CompleteOugoingRequestParameters
    ): Promise<ValidationResult> {
        for (let i = 0; i < params.receivedResponse.items.length; i++) {
            const requestItem = request.content.items[i]
            if (requestItem instanceof RequestItem) {
                const responseItem = params.receivedResponse.items[i] as ResponseItem
                const processor = this.processorRegistry.getProcessorForItem(requestItem)
                await processor.applyIncomingResponseItem(responseItem, requestItem)
            } else if (requestItem instanceof RequestItemGroup) {
                const responseGroup = params.receivedResponse.items[i] as ResponseItemGroup

                for (let j = 0; j < requestItem.items.length; j++) {
                    const groupRequestItem = requestItem.items[j]
                    const groupResponseItem = responseGroup.items[j]

                    const processor = this.processorRegistry.getProcessorForItem(groupRequestItem)
                    await processor.applyIncomingResponseItem(groupResponseItem, requestItem)
                }
            }
        }

        return ValidationResult.success()
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
}
