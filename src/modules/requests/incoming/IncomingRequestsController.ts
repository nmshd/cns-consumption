import {
    RequestItem,
    RequestItemGroup,
    Response,
    ResponseItem,
    ResponseItemGroup,
    ResponseResult
} from "@nmshd/content"
import {
    CoreDate,
    CoreId,
    ICoreAddress,
    ICoreId,
    Message,
    RelationshipChange,
    RelationshipTemplate,
    SynchronizedCollection,
    TransportErrors
} from "@nmshd/transport"
import {
    ConsumptionBaseController,
    ConsumptionControllerName,
    ConsumptionErrors,
    ConsumptionIds
} from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry"
import { ValidationResult } from "../itemProcessors/ValidationResult"
import { ILocalRequestSource, LocalRequest } from "../local/LocalRequest"
import { LocalRequestStatus } from "../local/LocalRequestStatus"
import { ConsumptionResponse, ConsumptionResponseSource } from "../local/LocalResponse"
import {
    CheckPrerequisitesOfIncomingRequestParameters,
    ICheckPrerequisitesOfIncomingRequestParameters
} from "./checkPrerequisites/CheckPrerequisitesOfIncomingRequestParameters"
import {
    CompleteIncomingRequestParameters,
    ICompleteIncomingRequestParameters
} from "./complete/CompleteIncomingRequestParameters"
import { DecideRequestItemGroupParametersJSON } from "./decide/DecideRequestItemGroupParameters"
import { DecideRequestItemParametersJSON } from "./decide/DecideRequestItemParameters"
import { DecideRequestParametersJSON } from "./decide/DecideRequestParameters"
import {
    InternalDecideRequestParameters,
    InternalDecideRequestParametersJSON
} from "./decide/InternalDecideRequestParameters"
import { DecideRequestParametersValidator } from "./DecideRequestParametersValidator"
import {
    IReceivedIncomingRequestParameters,
    ReceivedIncomingRequestParameters
} from "./received/ReceivedIncomingRequestParameters"
import {
    IRequireManualDecisionOfIncomingRequestParameters,
    RequireManualDecisionOfIncomingRequestParameters
} from "./requireManualDecision/RequireManualDecisionOfIncomingRequestParameters"

export class IncomingRequestsController extends ConsumptionBaseController {
    private readonly decideRequestParamsValidator: DecideRequestParametersValidator =
        new DecideRequestParametersValidator()

    public constructor(
        private readonly consumptionRequests: SynchronizedCollection,
        private readonly processorRegistry: RequestItemProcessorRegistry,
        parent: ConsumptionController
    ) {
        super(ConsumptionControllerName.RequestsController, parent)
    }

    public async received(params: IReceivedIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = ReceivedIncomingRequestParameters.from(params)

        const infoFromSource = this.extractInfoFromSource(parsedParams.requestSourceObject)

        const consumptionRequest = LocalRequest.from({
            id: parsedParams.receivedRequest.id ?? (await ConsumptionIds.request.generate()),
            createdAt: CoreDate.utc(),
            status: LocalRequestStatus.Open,
            content: parsedParams.receivedRequest,
            isOwn: false,
            peer: infoFromSource.peer,
            source: infoFromSource.source,
            statusLog: []
        })

        await this.consumptionRequests.create(consumptionRequest)

        return consumptionRequest
    }

    private extractInfoFromSource(source: Message | RelationshipTemplate): InfoFromSource {
        if (source instanceof Message) {
            return this.extractInfoFromMessage(source)
        }

        return this.extractInfoFromRelationshipTemplate(source)
    }

    private extractInfoFromMessage(message: Message): InfoFromSource {
        if (message.isOwn) throw new Error("Cannot create incoming Request from own Message")

        return {
            peer: message.cache!.createdBy,
            source: {
                reference: message.id,
                type: "Message"
            }
        }
    }

    private extractInfoFromRelationshipTemplate(template: RelationshipTemplate): InfoFromSource {
        if (template.isOwn) throw new Error("Cannot create incoming Request from own Relationship Template")

        return {
            peer: template.cache!.createdBy,
            source: {
                reference: template.id,
                type: "RelationshipTemplate"
            }
        }
    }

    public async checkPrerequisites(params: ICheckPrerequisitesOfIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CheckPrerequisitesOfIncomingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        this.assertRequestStatus(request, LocalRequestStatus.Open)

        for (const item of request.content.items) {
            if (item instanceof RequestItem) {
                const processor = this.processorRegistry.getProcessorForItem(item)
                const prerequisitesFulfilled = await processor.checkPrerequisitesOfIncomingRequestItem(item, request)
                if (!prerequisitesFulfilled) {
                    return request
                }
            } else {
                for (const childItem of item.items) {
                    const processor = this.processorRegistry.getProcessorForItem(childItem)
                    const prerequisitesFulfilled = await processor.checkPrerequisitesOfIncomingRequestItem(
                        childItem,
                        request
                    )
                    if (!prerequisitesFulfilled) {
                        return request
                    }
                }
            }
        }

        request.changeStatus(LocalRequestStatus.DecisionRequired)

        await this.update(request)

        return request
    }

    public async requireManualDecision(
        params: IRequireManualDecisionOfIncomingRequestParameters
    ): Promise<LocalRequest> {
        const parsedParams = RequireManualDecisionOfIncomingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        this.assertRequestStatus(request, LocalRequestStatus.DecisionRequired)

        request.changeStatus(LocalRequestStatus.ManualDecisionRequired)
        await this.update(request)

        return request
    }

    public async canAccept(params: DecideRequestParametersJSON): Promise<ValidationResult> {
        return await this.canDecide({ ...params, accept: true })
    }

    public async canReject(params: DecideRequestParametersJSON): Promise<ValidationResult> {
        return await this.canDecide({ ...params, accept: false })
    }

    private async canDecide(params: InternalDecideRequestParametersJSON): Promise<ValidationResult> {
        // syntactic validation
        InternalDecideRequestParameters.from(params)

        const request = await this.getOrThrow(params.requestId)

        const validationResult = this.decideRequestParamsValidator.validate(params, request)
        if (!validationResult.isSuccess) {
            throw new Error(validationResult.error.message)
        }

        this.assertRequestStatus(
            request,
            LocalRequestStatus.DecisionRequired,
            LocalRequestStatus.ManualDecisionRequired
        )

        const itemResults = await this.canDecideItems(params.items, request.content.items, request)

        return ValidationResult.fromItems(itemResults)
    }

    private async canDecideGroup(
        params: DecideRequestItemGroupParametersJSON,
        requestItemGroup: RequestItemGroup,
        request: LocalRequest
    ) {
        const itemResults = await this.canDecideItems(params.items, requestItemGroup.items, request)
        return ValidationResult.fromItems(itemResults)
    }

    private async canDecideItems(
        params: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[],
        items: (RequestItem | RequestItemGroup)[],
        request: LocalRequest
    ) {
        const validationResults: ValidationResult[] = []

        for (let i = 0; i < params.length; i++) {
            const decideItemParams = params[i]
            const requestItem = items[i]

            if (requestItem instanceof RequestItemGroup) {
                const groupResult = await this.canDecideGroup(
                    decideItemParams as DecideRequestItemGroupParametersJSON,
                    requestItem,
                    request
                )
                validationResults.push(groupResult)
            } else {
                const itemResult = await this.canDecideItem(
                    decideItemParams as DecideRequestItemParametersJSON,
                    requestItem,
                    request
                )
                validationResults.push(itemResult)
            }
        }

        return validationResults
    }

    private async canDecideItem(
        params: DecideRequestItemParametersJSON,
        requestItem: RequestItem,
        request: LocalRequest
    ) {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)

        try {
            if (params.accept) {
                return await processor.canAccept(requestItem, params, request)
            }
            return await processor.canReject(requestItem, params, request)
        } catch (e) {
            return ValidationResult.error(ConsumptionErrors.requests.unexpectedErrorDuringRequestItemProcessing(e))
        }
    }

    public async accept(params: DecideRequestParametersJSON): Promise<LocalRequest> {
        const canAccept = await this.canAccept(params)
        if (!canAccept.isSuccess()) {
            throw new Error(
                "Cannot accept the Request with the given parameters. Call 'canAccept' to get more information."
            )
        }
        return await this.decide({ ...params, accept: true })
    }

    public async reject(params: DecideRequestParametersJSON): Promise<LocalRequest> {
        const canReject = await this.canReject(params)
        if (!canReject.isSuccess()) {
            throw new Error(
                "Cannot reject the Request with the given parameters. Call 'canReject' to get more information."
            )
        }
        return await this.decide({ ...params, accept: false })
    }

    private async decide(params: InternalDecideRequestParametersJSON) {
        const consumptionRequest = await this.getOrThrow(params.requestId)

        this.assertRequestStatus(
            consumptionRequest,
            LocalRequestStatus.DecisionRequired,
            LocalRequestStatus.ManualDecisionRequired
        )

        const consumptionResponse = await this.createConsumptionResponse(params, consumptionRequest)

        consumptionRequest.response = consumptionResponse
        consumptionRequest.changeStatus(LocalRequestStatus.Decided)

        await this.update(consumptionRequest)

        return consumptionRequest
    }

    private async createConsumptionResponse(params: InternalDecideRequestParametersJSON, request: LocalRequest) {
        const requestItems = request.content.items
        const responseItems = await this.decideItems(params.items, requestItems, request)

        const response = Response.from({
            result: params.accept ? ResponseResult.Accepted : ResponseResult.Rejected,
            requestId: request.id,
            items: responseItems
        })

        const consumptionResponse = ConsumptionResponse.from({
            content: response,
            createdAt: CoreDate.utc()
        })

        return consumptionResponse
    }

    private async decideGroup(
        groupItemParam: DecideRequestItemGroupParametersJSON,
        requestItemGroup: RequestItemGroup,
        request: LocalRequest
    ) {
        const items = (await this.decideItems(groupItemParam.items, requestItemGroup.items, request)) as ResponseItem[]

        const group = ResponseItemGroup.from({
            items: items,
            metadata: requestItemGroup.responseMetadata
        })
        return group
    }

    private async decideItems(
        params: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[],
        requestItems: (RequestItemGroup | RequestItem)[],
        request: LocalRequest
    ) {
        const responseItems: (ResponseItem | ResponseItemGroup)[] = []

        for (let i = 0; i < params.length; i++) {
            const itemParam = params[i]
            const item = requestItems[i]

            if (item instanceof RequestItemGroup) {
                responseItems.push(
                    await this.decideGroup(itemParam as DecideRequestItemGroupParametersJSON, item, request)
                )
            } else {
                responseItems.push(
                    await this.decideItem(
                        itemParam as DecideRequestItemParametersJSON,
                        requestItems[i] as RequestItem,
                        request
                    )
                )
            }
        }
        return responseItems
    }

    private async decideItem(
        params: DecideRequestItemParametersJSON,
        requestItem: RequestItem,
        request: LocalRequest
    ): Promise<ResponseItem> {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)

        try {
            if (params.accept) {
                return await processor.accept(requestItem, params, request)
            }
            return await processor.reject(requestItem, params, request)
        } catch (e) {
            let details = ""
            if (e instanceof Error) {
                details = ` Details: ${e.message}`
            }
            throw new Error(
                `An error occurred while processing a '${requestItem.constructor.name}'. You should contact the developer of this RequestItem.${details}}`
            )
        }
    }

    public async complete(params: ICompleteIncomingRequestParameters): Promise<LocalRequest> {
        const parsedParams = CompleteIncomingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        if (request.isOwn) {
            throw new Error("Cannot decide own Request")
        }

        this.assertRequestStatus(request, LocalRequestStatus.Decided)

        let responseSource: "Message" | "RelationshipChange"

        if (parsedParams.responseSourceObject instanceof Message) {
            responseSource = "Message"
        } else if (parsedParams.responseSourceObject instanceof RelationshipChange) {
            responseSource = "RelationshipChange"
        } else {
            throw new Error("Unknown response source")
        }

        request.response!.source = ConsumptionResponseSource.from({
            type: responseSource,
            reference: parsedParams.responseSourceObject.id
        })

        request.changeStatus(LocalRequestStatus.Completed)

        await this.update(request)

        return request
    }

    public async getIncomingRequests(query?: any): Promise<LocalRequest[]> {
        query ??= {}
        query.isOwn = false

        const requestDocs = await this.consumptionRequests.find(query)

        const requests = requestDocs.map((r) => LocalRequest.from(r))
        return requests
    }

    public async getIncomingRequest(idIncomingRequest: ICoreId): Promise<LocalRequest | undefined> {
        const requestDoc = await this.consumptionRequests.findOne({ id: idIncomingRequest.toString(), isOwn: false })
        const request = requestDoc ? LocalRequest.from(requestDoc) : undefined
        return request
    }

    private async getOrThrow(id: CoreId | string) {
        const request = await this.getIncomingRequest(CoreId.from(id))
        if (!request) {
            throw TransportErrors.general.recordNotFound(LocalRequest, id.toString())
        }
        return request
    }

    private async update(request: LocalRequest) {
        const requestDoc = await this.consumptionRequests.findOne({ id: request.id.toString(), isOwn: false })
        if (!requestDoc) {
            throw TransportErrors.general.recordNotFound(LocalRequest, request.id.toString())
        }
        await this.consumptionRequests.update(requestDoc, request)
    }

    private assertRequestStatus(request: LocalRequest, ...status: LocalRequestStatus[]) {
        if (!status.includes(request.status)) {
            throw new Error(`Consumption Request has to be in status '${status.join("/")}'.`)
        }
    }
}

interface InfoFromSource {
    peer: ICoreAddress
    source: ILocalRequestSource
}
