import { IDatabaseCollection } from "@js-soft/docdb-access-abstractions"
import {
    RequestItem,
    RequestItemGroup,
    Response,
    ResponseItem,
    ResponseItemGroup,
    ResponseResult
} from "@nmshd/content"
import {
    CoreAddress,
    CoreDate,
    CoreId,
    ICoreId,
    Message,
    RelationshipTemplate,
    TransportErrors
} from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName } from "../../../consumption"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { RequestItemProcessorRegistry } from "../itemProcessors/RequestItemProcessorRegistry"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { ConsumptionRequestStatus } from "../local/ConsumptionRequestStatus"
import { ConsumptionResponse } from "../local/ConsumptionResponse"
import {
    CheckPrerequisitesOfOutgoingRequestParameters,
    ICheckPrerequisitesOfOutgoingRequestParameters
} from "./checkPrerequisites/CheckPrerequisitesOfOutgoingRequestParameters"
import { AcceptRequestItemParameters } from "./decideRequestParameters/AcceptRequestItemParameters"
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
import { RejectRequestItemParameters } from "./decideRequestParameters/RejectRequestItemParameters"
import { IRejectRequestParameters, RejectRequestParameters } from "./decideRequestParameters/RejectRequestParameters"
import { DecideRequestParametersValidator } from "./DecideRequestParametersValidator"
import {
    IReceivedIncomingRequestParameters,
    ReceivedIncomingRequestParameters
} from "./receivedIncomingRequestParameters/ReceivedIncomingRequestParameters"

export class IncomingRequestsController extends ConsumptionBaseController {
    public async checkPrerequisites(
        params: ICheckPrerequisitesOfOutgoingRequestParameters
    ): Promise<ConsumptionRequest> {
        const parsedParams = await CheckPrerequisitesOfOutgoingRequestParameters.from(params)
        const request = await this.getOrThrow(parsedParams.requestId)

        if (request.status !== ConsumptionRequestStatus.Open) {
            throw new Error("Consumption Request has to be in status 'Open'.")
        }

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

        request.changeStatus(ConsumptionRequestStatus.WaitingForDecision)

        await this.update(request)

        return request
    }

    private consumptionRequests: IDatabaseCollection
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
        const parsedParams = await ReceivedIncomingRequestParameters.from(params)

        const infoFromSource = this.extractInfoFromSource(parsedParams.sourceObject)

        const consumptionRequest = await ConsumptionRequest.from({
            id: parsedParams.content.id ? CoreId.from(parsedParams.content.id) : await CoreId.generate(),
            createdAt: CoreDate.utc(),
            status: ConsumptionRequestStatus.Open,
            content: parsedParams.content,
            isOwn: infoFromSource.isOwn,
            peer: infoFromSource.peer,
            source: { reference: infoFromSource.sourceReference, type: infoFromSource.sourceType },
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
            isOwn: this.parent.accountController.identity.isMe(message.cache!.createdBy),
            peer: message.cache!.createdBy,
            sourceReference: message.id,
            sourceType: "Message"
        }
    }

    private extractInfoFromRelationshipTemplate(template: RelationshipTemplate): InfoFromSource {
        if (template.isOwn) throw new Error("Cannot create incoming Request from own Relationship Template")

        return {
            isOwn: this.parent.accountController.identity.isMe(template.cache!.createdBy),
            peer: template.cache!.createdBy,
            sourceReference: template.id,
            sourceType: "RelationshipTemplate"
        }
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

        if (consumptionRequest.status !== ConsumptionRequestStatus.WaitingForDecision) {
            throw new Error("Consumption Request has to be in status 'WaitingForDecision'.")
        }

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
        const processor = this.processorRegistry.getProcessorForItem(requestItem)

        if (params instanceof AcceptRequestItemParameters) {
            return await processor.accept(requestItem, params)
        } else if (params instanceof RejectRequestItemParameters) {
            return await processor.reject(requestItem, params)
        }

        throw new Error("Unknown params type")
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

    public async complete(id: ICoreId): Promise<ConsumptionRequest> {
        const requestDoc = await this.consumptionRequests.read(id.toString())
        const request = await ConsumptionRequest.from(requestDoc)

        if (request.isOwn) {
            throw new Error("Cannot decide own Request")
        }

        if (request.status !== ConsumptionRequestStatus.Decided) {
            throw new Error(`Can only decide Request in status '${ConsumptionRequestStatus.Decided}'`)
        }

        request.changeStatus(ConsumptionRequestStatus.Completed)

        await this.consumptionRequests.update(requestDoc, request)

        return request
    }

    public async get(id: ICoreId): Promise<ConsumptionRequest | undefined> {
        const requestDoc = await this.consumptionRequests.findOne({ id: id.toString(), isOwn: false })
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
        const requestDoc = await this.consumptionRequests.findOne({ id: request.id.toString(), isOwn: false })
        if (!requestDoc) {
            throw TransportErrors.general.recordNotFound(ConsumptionRequest, request.id.toString())
        }
        await this.consumptionRequests.update(requestDoc, request)
    }
}

interface InfoFromSource {
    isOwn: boolean
    peer: CoreAddress
    sourceReference: CoreId
    sourceType: "Message" | "RelationshipTemplate"
}
