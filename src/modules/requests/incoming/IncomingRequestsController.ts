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
import { ConsumptionBaseController, ConsumptionControllerName } from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry"
import { ValidationResult } from "../itemProcessors/ValidationResult"
import { ConsumptionRequest, IConsumptionRequestSource } from "../local/ConsumptionRequest"
import { ConsumptionRequestStatus } from "../local/ConsumptionRequestStatus"
import { ConsumptionResponse, ConsumptionResponseSource } from "../local/ConsumptionResponse"
import {
    CheckPrerequisitesOfIncomingRequestParameters,
    ICheckPrerequisitesOfIncomingRequestParameters
} from "./checkPrerequisites/CheckPrerequisitesOfIncomingRequestParameters"
import {
    CompleteIncomingRequestParameters,
    ICompleteIncomingRequestParameters
} from "./complete/CompleteIncomingRequestParameters"
import { AcceptRequestItemParameters } from "./decide/AcceptRequestItemParameters"
import { AcceptRequestParameters, IAcceptRequestParameters } from "./decide/AcceptRequestParameters"
import {
    DecideRequestItemGroupParameters,
    IDecideRequestItemGroupParameters
} from "./decide/DecideRequestItemGroupParameters"
import { DecideRequestItemParameters, IDecideRequestItemParameters } from "./decide/DecideRequestItemParameters"
import { DecideRequestParameters } from "./decide/DecideRequestParameters"
import { RejectRequestItemParameters } from "./decide/RejectRequestItemParameters"
import { IRejectRequestParameters, RejectRequestParameters } from "./decide/RejectRequestParameters"
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
    private consumptionRequests: SynchronizedCollection
    private readonly decideRequestParamsValidator: DecideRequestParametersValidator =
        new DecideRequestParametersValidator()

    public constructor(parent: ConsumptionController, public readonly processorRegistry: RequestItemProcessorRegistry) {
        super(ConsumptionControllerName.RequestsController, parent)
    }

    public override async init(): Promise<IncomingRequestsController> {
        await super.init()
        this.consumptionRequests = await this.parent.accountController.getSynchronizedCollection("Requests")
        return this
    }

    public async received(params: IReceivedIncomingRequestParameters): Promise<ConsumptionRequest> {
        const parsedParams = ReceivedIncomingRequestParameters.from(params)

        const infoFromSource = this.extractInfoFromSource(parsedParams.requestSourceObject)

        const consumptionRequest = ConsumptionRequest.from({
            id: parsedParams.receivedRequest.id ?? (await CoreId.generate()),
            createdAt: CoreDate.utc(),
            status: ConsumptionRequestStatus.Open,
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

    public async checkPrerequisites(
        params: ICheckPrerequisitesOfIncomingRequestParameters
    ): Promise<ConsumptionRequest> {
        const parsedParams = CheckPrerequisitesOfIncomingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        this.assertRequestStatus(request, ConsumptionRequestStatus.Open)

        for (const item of request.content.items) {
            if (item instanceof RequestItem) {
                const processor = this.processorRegistry.getProcessorForItem(item)
                const prerequisitesFulfilled = await processor.checkPrerequisitesOfIncomingRequestItem(item)
                if (!prerequisitesFulfilled) {
                    return request
                }
            } else {
                for (const childItem of item.items) {
                    const processor = this.processorRegistry.getProcessorForItem(childItem)
                    const prerequisitesFulfilled = await processor.checkPrerequisitesOfIncomingRequestItem(childItem)
                    if (!prerequisitesFulfilled) {
                        return request
                    }
                }
            }
        }

        request.changeStatus(ConsumptionRequestStatus.DecisionRequired)

        await this.update(request)

        return request
    }

    public async requireManualDecision(
        params: IRequireManualDecisionOfIncomingRequestParameters
    ): Promise<ConsumptionRequest> {
        const parsedParams = RequireManualDecisionOfIncomingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        this.assertRequestStatus(request, ConsumptionRequestStatus.DecisionRequired)

        request.changeStatus(ConsumptionRequestStatus.ManualDecisionRequired)
        await this.update(request)

        return request
    }

    public async canAccept(params: IAcceptRequestParameters): Promise<ValidationResult> {
        const parsedParams = AcceptRequestParameters.from(params)
        return await this.canDecide(parsedParams, "Accept")
    }

    public async canReject(params: IRejectRequestParameters): Promise<ValidationResult> {
        const parsedParams = RejectRequestParameters.from(params)
        return await this.canDecide(parsedParams, "Reject")
    }

    private async canDecide(params: DecideRequestParameters, action: "Accept" | "Reject"): Promise<ValidationResult> {
        const request = await this.getOrThrow(params.requestId)

        this.assertRequestStatus(
            request,
            ConsumptionRequestStatus.DecisionRequired,
            ConsumptionRequestStatus.ManualDecisionRequired
        )

        const itemResults = await this.canDecideItems(params.items, request.content.items, action)

        return ValidationResult.fromItems(itemResults)
    }

    private async canDecideGroup(
        params: DecideRequestItemGroupParameters,
        requestItemGroup: RequestItemGroup,
        action: "Accept" | "Reject"
    ) {
        const itemResults = await this.canDecideItems(params.items, requestItemGroup.items, action)
        return ValidationResult.fromItems(itemResults)
    }

    private async canDecideItems(
        params: IDecideRequestItemParameters[],
        items: (RequestItem | RequestItemGroup)[],
        action: "Accept" | "Reject"
    ) {
        const validationResults: ValidationResult[] = []

        for (let i = 0; i < params.length; i++) {
            const decideItemParams = params[i]
            const requestItem = items[i]

            if (requestItem instanceof RequestItemGroup) {
                const groupResult = await this.canDecideGroup(
                    decideItemParams as DecideRequestItemGroupParameters,
                    requestItem,
                    action
                )
                validationResults.push(groupResult)
            } else {
                const itemResult = await this.canDecideItem(
                    decideItemParams as DecideRequestItemParameters,
                    requestItem,
                    action
                )
                validationResults.push(itemResult)
            }
        }

        return validationResults
    }

    private canDecideItem(params: DecideRequestItemParameters, requestItem: RequestItem, action: "Accept" | "Reject") {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)
        return processor[`can${action}`](requestItem, params)
    }

    public async accept(params: IAcceptRequestParameters): Promise<ConsumptionRequest> {
        const canAccept = await this.canAccept(params)
        if (!canAccept.isSuccess()) {
            throw new Error(
                "Cannot accept the Request with the given parameters. Call 'canAccept' to get more information."
            )
        }
        return await this.decide(AcceptRequestParameters.from(params))
    }

    public async reject(params: IRejectRequestParameters): Promise<ConsumptionRequest> {
        const canReject = await this.canReject(params)
        if (!canReject.isSuccess()) {
            throw new Error(
                "Cannot reject the Request with the given parameters. Call 'canReject' to get more information."
            )
        }
        return await this.decide(RejectRequestParameters.from(params))
    }

    private async decide(params: DecideRequestParameters) {
        const consumptionRequest = await this.getOrThrow(params.requestId)

        this.assertRequestStatus(
            consumptionRequest,
            ConsumptionRequestStatus.DecisionRequired,
            ConsumptionRequestStatus.ManualDecisionRequired
        )

        const validationResult = this.decideRequestParamsValidator.validate(params, consumptionRequest)
        if (!validationResult.isSuccess) {
            throw new Error(validationResult.error.message)
        }

        const consumptionResponse = await this.createConsumptionResponse(params, consumptionRequest)

        consumptionRequest.response = consumptionResponse
        consumptionRequest.changeStatus(ConsumptionRequestStatus.Decided)

        await this.update(consumptionRequest)

        return consumptionRequest
    }

    private async createConsumptionResponse(
        params: AcceptRequestParameters | RejectRequestParameters,
        request: ConsumptionRequest
    ) {
        const requestItems = request.content.items
        const responseItems = await this.decideItems(params.items, requestItems)

        const response = Response.from({
            result: params instanceof AcceptRequestParameters ? ResponseResult.Accepted : ResponseResult.Rejected,
            requestId: request.id,
            items: responseItems
        })

        const consumptionResponse = ConsumptionResponse.from({
            content: response,
            createdAt: CoreDate.utc()
        })

        return consumptionResponse
    }

    private async decideGroup(groupItemParam: DecideRequestItemGroupParameters, requestItemGroup: RequestItemGroup) {
        const items = (await this.decideItems(groupItemParam.items, requestItemGroup.items)) as ResponseItem[]

        const group = ResponseItemGroup.from({
            items: items,
            metadata: requestItemGroup.responseMetadata
        })
        return group
    }

    private async decideItems(
        params: (IDecideRequestItemParameters | IDecideRequestItemGroupParameters)[],
        requestItems: (RequestItemGroup | RequestItem)[]
    ) {
        const responseItems: (ResponseItem | ResponseItemGroup)[] = []

        for (let i = 0; i < params.length; i++) {
            const itemParam = params[i]

            if (itemParam instanceof DecideRequestItemParameters) {
                responseItems.push(await this.decideItem(itemParam, requestItems[i] as RequestItem))
            } else if (itemParam instanceof DecideRequestItemGroupParameters) {
                responseItems.push(await this.decideGroup(itemParam, requestItems[i] as RequestItemGroup))
            }
        }
        return responseItems
    }

    private async decideItem(params: DecideRequestItemParameters, requestItem: RequestItem): Promise<ResponseItem> {
        const processor = this.processorRegistry.getProcessorForItem(requestItem)

        try {
            if (params instanceof AcceptRequestItemParameters) {
                return await processor.accept(requestItem, params)
            } else if (params instanceof RejectRequestItemParameters) {
                return await processor.reject(requestItem, params)
            }
        } catch (e) {
            let details = ""
            if (e instanceof Error) {
                details = ` Details: ${e.message}`
            }
            throw new Error(
                `An error occurred while processing a '${requestItem.constructor.name}'. You should contact the developer of this RequestItem.${details}}`
            )
        }
        throw new Error("Unknown params type")
    }

    public async complete(params: ICompleteIncomingRequestParameters): Promise<ConsumptionRequest> {
        const parsedParams = CompleteIncomingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        if (request.isOwn) {
            throw new Error("Cannot decide own Request")
        }

        this.assertRequestStatus(request, ConsumptionRequestStatus.Decided)

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

        request.changeStatus(ConsumptionRequestStatus.Completed)

        await this.update(request)

        return request
    }

    public async get(id: ICoreId): Promise<ConsumptionRequest | undefined> {
        const requestDoc = await this.consumptionRequests.findOne({ id: id.toString(), isOwn: false })
        const request = requestDoc ? ConsumptionRequest.from(requestDoc) : undefined
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
        const requestDoc = await this.consumptionRequests.findOne({ id: request.id.toString(), isOwn: false })
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

interface InfoFromSource {
    peer: ICoreAddress
    source: IConsumptionRequestSource
}
