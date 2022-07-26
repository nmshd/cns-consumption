import { IDatabaseCollection, IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { DataEvent, EventEmitter2EventBus } from "@js-soft/ts-utils"
import {
    ConsumptionController,
    ConsumptionIds,
    DecideRequestParametersJSON,
    ICheckPrerequisitesOfIncomingRequestParameters,
    ICompleteIncomingRequestParameters,
    ICompleteOugoingRequestParameters,
    ICreateOutgoingRequestFromRelationshipCreationChangeParameters,
    ICreateOutgoingRequestParameters,
    ILocalRequestSource,
    IncomingRequestsController,
    IReceivedIncomingRequestParameters,
    IRequireManualDecisionOfIncomingRequestParameters,
    ISentOutgoingRequestParameters,
    LocalRequest,
    LocalRequestSource,
    LocalRequestStatus,
    LocalResponse,
    OutgoingRequestsController,
    ReceivedIncomingRequestParameters,
    RequestItemProcessorRegistry,
    ValidationResult
} from "@nmshd/consumption"
import {
    AcceptResponseItem,
    IRequest,
    IResponse,
    RelationshipTemplateBody,
    Request,
    RequestItemGroup,
    Response,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content"
import {
    AccountController,
    CoreAddress,
    CoreId,
    IConfigOverwrite,
    ICoreId,
    IdentityController,
    IMessage,
    IRelationshipTemplate,
    Message,
    RelationshipChangeType,
    RelationshipTemplate,
    SynchronizedCollection,
    Transport
} from "@nmshd/transport"
import { expect } from "chai"

import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { MockEventBus } from "../MockEventBus"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export abstract class RequestsIntegrationTest extends IntegrationTest {
    public Given: RequestsGiven // eslint-disable-line @typescript-eslint/naming-convention
    public When: RequestsWhen // eslint-disable-line @typescript-eslint/naming-convention
    public Then: RequestsThen // eslint-disable-line @typescript-eslint/naming-convention

    public constructor(config: IConfigOverwrite, connection: IDatabaseConnection, loggerFactory: ILoggerFactory) {
        super(config, connection, loggerFactory)
    }

    protected init(context: RequestsTestsContext): void {
        this.Given = new RequestsGiven(context)
        this.When = new RequestsWhen(context)
        this.Then = new RequestsThen(context)
    }
}

export class RequestsTestsContext {
    public requestsCollection: IDatabaseCollection
    public incomingRequestsController: IncomingRequestsController
    public outgoingRequestsController: OutgoingRequestsController
    public currentIdentity: CoreAddress
    public mockEventBus = new MockEventBus()

    private constructor() {
        // hide constructor
    }

    public static async create(
        dbConnection: IDatabaseConnection,
        config: IConfigOverwrite
    ): Promise<RequestsTestsContext> {
        const context = new RequestsTestsContext()

        const transport = await new Transport(
            dbConnection,
            config,
            new EventEmitter2EventBus(() => {
                // noop
            })
        ).init()
        const database = await dbConnection.getDatabase(Math.random().toString(36).substring(7))
        const collection = new SynchronizedCollection(await database.getCollection("Requests"), 0)
        const fakeConsumptionController = {
            transport,
            accountController: {
                identity: { address: CoreAddress.from("anAddress") } as IdentityController
            } as AccountController
        } as ConsumptionController
        const processorRegistry = new RequestItemProcessorRegistry(
            fakeConsumptionController,
            new Map([[TestRequestItem, TestRequestItemProcessor]])
        )

        context.currentIdentity = CoreAddress.from("id12345")

        context.outgoingRequestsController = new OutgoingRequestsController(
            collection,
            processorRegistry,
            undefined!,
            context.mockEventBus,
            { address: CoreAddress.from("anAddress") }
        )

        context.incomingRequestsController = new IncomingRequestsController(
            collection,
            processorRegistry,
            undefined!,
            context.mockEventBus,
            { address: CoreAddress.from("anAddress") }
        )
        context.requestsCollection = context.incomingRequestsController["localRequests"]

        const originalCanCreate = context.outgoingRequestsController.canCreate
        context.outgoingRequestsController.canCreate = (params: ICreateOutgoingRequestParameters) => {
            context.canCreateWasCalled = true
            return originalCanCreate.call(context.outgoingRequestsController, params)
        }

        return context
    }

    public reset(): void {
        this.canCreateWasCalled = false
        this.givenLocalRequest = undefined
        this.localRequestAfterAction = undefined
        this.validationResult = undefined
        this.actionToTry = undefined

        TestRequestItemProcessor.numberOfApplyIncomingResponseItemCalls = 0

        this.mockEventBus.clearPublishedEvents()
    }

    public givenLocalRequest?: LocalRequest
    public localRequestAfterAction?: LocalRequest
    public localRequestsAfterAction?: LocalRequest[]
    public validationResult?: ValidationResult
    public canCreateWasCalled = false
    public actionToTry?: () => Promise<void>
}

export class RequestsGiven {
    public constructor(private readonly context: RequestsTestsContext) {}

    public async anIncomingRequest(): Promise<LocalRequest> {
        return await this.anIncomingRequestWith({})
    }

    public async anIncomingRequestWithAnItemAndAGroupInStatus(status: LocalRequestStatus): Promise<void> {
        const content = Request.from({
            "@type": "Request",
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false,
                    metadata: {
                        outerItemMetaKey: "outerItemMetaValue"
                    }
                }),
                RequestItemGroup.from({
                    "@type": "RequestItemGroup",
                    mustBeAccepted: false,
                    metadata: {
                        groupMetaKey: "groupMetaValue"
                    },
                    items: [
                        TestRequestItem.from({
                            metadata: {
                                innerItemMetaKey: "innerItemMetaValue"
                            },
                            mustBeAccepted: false
                        })
                    ]
                })
            ]
        })

        await this.anIncomingRequestWith({ content, status })
    }

    public async anIncomingRequestWith(params: {
        id?: CoreId
        content?: IRequest
        status?: LocalRequestStatus
        requestSource?: IMessage | IRelationshipTemplate
    }): Promise<LocalRequest> {
        params.id ??= await ConsumptionIds.request.generate()
        params.content ??= TestObjectFactory.createRequestWithOneItem({ id: params.id })
        params.status ??= LocalRequestStatus.Open
        params.requestSource ??= TestObjectFactory.createIncomingMessage(this.context.currentIdentity)

        const localRequest = await this.context.incomingRequestsController.received({
            receivedRequest: params.content,
            requestSourceObject: params.requestSource
        })

        await this.moveIncomingRequestToStatus(localRequest, params.status)

        this.context.givenLocalRequest = localRequest

        return localRequest
    }

    public async anIncomingRequestInStatus(status: LocalRequestStatus): Promise<void> {
        await this.anIncomingRequestWith({ status: status })
    }

    public async aRejectedIncomingRequestFromARelationshipTemplate(): Promise<void> {
        await this.anIncomingRequestWith({
            status: LocalRequestStatus.DecisionRequired,
            requestSource: TestObjectFactory.createIncomingRelationshipTemplate()
        })

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.reject({
            requestId: this.context.givenLocalRequest!.id.toString(),
            items: [
                {
                    accept: false
                }
            ]
        })
    }

    private async moveIncomingRequestToStatus(localRequest: LocalRequest, status: LocalRequestStatus) {
        if (localRequest.status === status) return

        if (isStatusAAfterStatusB(status, localRequest.status)) {
            localRequest = await this.context.incomingRequestsController.checkPrerequisites({
                requestId: localRequest.id
            })
        }

        if (isStatusAAfterStatusB(status, localRequest.status)) {
            localRequest = await this.context.incomingRequestsController.accept({
                requestId: localRequest.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            })
        }

        if (isStatusAAfterStatusB(status, localRequest.status)) {
            localRequest = await this.context.incomingRequestsController.complete({
                requestId: localRequest.id,
                responseSourceObject: TestObjectFactory.createOutgoingIMessage(this.context.currentIdentity)
            })
        }
    }

    public async anOutgoingRequest(): Promise<LocalRequest> {
        return await this.anOutgoingRequestWith({})
    }

    public async anOutgoingRequestInStatus(status: LocalRequestStatus): Promise<void> {
        await this.anOutgoingRequestWith({ status: status })
    }

    public async anOutgoingRequestWith(params: {
        status?: LocalRequestStatus
        content?: IRequest
    }): Promise<LocalRequest> {
        params.status ??= LocalRequestStatus.Open
        params.content ??= {
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false
                })
            ]
        }

        this.context.givenLocalRequest = await this.context.outgoingRequestsController.create({
            content: params.content,
            peer: CoreAddress.from("id1")
        })

        await this.moveOutgoingRequestToStatus(this.context.givenLocalRequest, params.status)

        return this.context.givenLocalRequest
    }

    private async moveOutgoingRequestToStatus(localRequest: LocalRequest, status: LocalRequestStatus) {
        if (localRequest.status === status) return

        if (isStatusAAfterStatusB(status, LocalRequestStatus.Draft)) {
            await this.context.outgoingRequestsController.sent({
                requestId: localRequest.id,
                requestSourceObject: TestObjectFactory.createOutgoingIMessage(this.context.currentIdentity)
            })
        }
    }
}

export class RequestsWhen {
    public async iCallCanAccept(): Promise<void> {
        await this.iCallCanAcceptWith({})
    }

    public async iTryToCallCanAccept(): Promise<void> {
        await this.iTryToCallCanAcceptWith({})
    }

    public iTryToCallCanAcceptWithoutARequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.canAccept({} as DecideRequestParametersJSON)
        }
        return Promise.resolve()
    }

    public iTryToCallCanAcceptWith(params: Partial<DecideRequestParametersJSON>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCallCanAcceptWith(params)
        }
        return Promise.resolve()
    }

    public async iCallCanAcceptWith(params: Partial<DecideRequestParametersJSON>): Promise<ValidationResult> {
        params.items ??= [
            {
                accept: true
            }
        ]
        params.requestId ??= this.context.givenLocalRequest!.id.toString()

        this.context.validationResult = await this.context.incomingRequestsController.canAccept(
            params as DecideRequestParametersJSON
        )

        return this.context.validationResult
    }

    public async iCallCanReject(): Promise<void> {
        await this.iCallCanRejectWith({})
    }

    public async iTryToCallCanReject(): Promise<void> {
        await this.iTryToCallCanRejectWith({})
    }

    public iTryToCallCanRejectWithoutARequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.canReject({} as DecideRequestParametersJSON)
        }
        return Promise.resolve()
    }

    public iTryToCallCanRejectWith(params: Partial<DecideRequestParametersJSON>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCallCanRejectWith(params)
        }
        return Promise.resolve()
    }

    public async iCallCanRejectWith(params: Partial<DecideRequestParametersJSON>): Promise<ValidationResult> {
        params.items ??= [
            {
                accept: false
            }
        ]
        params.requestId ??= this.context.givenLocalRequest!.id.toString()

        this.context.validationResult = await this.context.incomingRequestsController.canReject(
            params as DecideRequestParametersJSON
        )

        return this.context.validationResult
    }

    public async iRequireManualDecision(): Promise<void> {
        await this.iRequireManualDecisionWith({})
    }

    public async iTryToRequireManualDecision(): Promise<void> {
        await this.iTryToRequireManualDecisionWith({})
    }

    public iTryToRequireManualDecisionWithoutRequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.requireManualDecision(
                {} as IRequireManualDecisionOfIncomingRequestParameters
            )
        }

        return Promise.resolve()
    }

    public iTryToRequireManualDecisionWith(
        params: Partial<IRequireManualDecisionOfIncomingRequestParameters>
    ): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iRequireManualDecisionWith(params)
        }

        return Promise.resolve()
    }

    public async iRequireManualDecisionWith(
        params: Partial<IRequireManualDecisionOfIncomingRequestParameters>
    ): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id
        this.context.localRequestAfterAction = await this.context.incomingRequestsController.requireManualDecision(
            params as IRequireManualDecisionOfIncomingRequestParameters
        )
    }

    public iTryToAccept(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept({
                requestId: this.context.givenLocalRequest!.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            })
        }
        return Promise.resolve()
    }

    public iTryToAcceptWith(params: Partial<DecideRequestParametersJSON>): void {
        params.requestId ??= this.context.givenLocalRequest!.id.toString()
        params.items ??= [
            {
                accept: true
            }
        ]

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept(params as DecideRequestParametersJSON)
        }
    }

    public iTryToCallReceivedWithoutSource(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.received({
                receivedRequest: TestObjectFactory.createRequestWithOneItem()
            } as ReceivedIncomingRequestParameters)
        }

        return Promise.resolve()
    }

    public iTryToReject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject({
                requestId: this.context.givenLocalRequest!.id.toString(),
                items: [
                    {
                        accept: false
                    }
                ]
            })
        }
        return Promise.resolve()
    }

    public iTryToRejectWith(params: Partial<DecideRequestParametersJSON>): void {
        params.requestId ??= this.context.givenLocalRequest!.id.toString()
        params.items ??= [
            {
                accept: false
            }
        ]

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject(params as DecideRequestParametersJSON)
        }
    }

    public async iCheckPrerequisites(): Promise<void> {
        await this.iCheckPrerequisitesWith({})
    }

    public async iTryToCheckPrerequisites(): Promise<void> {
        await this.iTryToCheckPrerequisitesWith({})
    }

    public iTryToCheckPrerequisitesWith(
        params: Partial<ICheckPrerequisitesOfIncomingRequestParameters>
    ): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCheckPrerequisitesWith(params as ICheckPrerequisitesOfIncomingRequestParameters)
        }
        return Promise.resolve()
    }

    public iTryToCheckPrerequisitesWithoutARequestId(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.checkPrerequisites({} as any)
        }
        return Promise.resolve()
    }

    public async iCheckPrerequisitesWith(
        params: Partial<ICheckPrerequisitesOfIncomingRequestParameters>
    ): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest?.id

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.checkPrerequisites(
            params as ICheckPrerequisitesOfIncomingRequestParameters
        )
    }

    public iTryToCallSentWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.sent({
                requestId: this.context.givenLocalRequest!.id,
                requestSourceObject: undefined
            } as any)
        }
        return Promise.resolve()
    }

    public async iCallSent(): Promise<void> {
        await this.iCallSentWith({})
    }

    public async iCallSentWith(params: Partial<ISentOutgoingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id
        params.requestSourceObject ??= TestObjectFactory.createOutgoingMessage(this.context.currentIdentity)

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.sent({
            requestId: params.requestId,
            requestSourceObject: params.requestSourceObject
        })
    }

    public iTryToCompleteTheOutgoingRequest(): void {
        this.iTryToCompleteTheOutgoingRequestWith({})
    }

    public iTryToCompleteTheOutgoingRequestWith(params: {
        requestId?: ICoreId
        responseSourceObject?: IMessage
        receivedResponse?: Omit<IResponse, "id">
    }): void {
        params.requestId ??= this.context.givenLocalRequest!.id
        params.responseSourceObject ??= TestObjectFactory.createIncomingIMessage(this.context.currentIdentity)
        params.receivedResponse ??= TestObjectFactory.createResponse()

        params.receivedResponse.requestId = params.requestId

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete(params as ICompleteOugoingRequestParameters)
        }
    }

    public iTryToCallCompleteWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete({
                requestId: this.context.givenLocalRequest!.id,
                receivedResponse: TestObjectFactory.createResponse()
            } as any)
        }

        return Promise.resolve()
    }

    public iTryToCallSent(): void {
        this.iTryToCallSentWith({})
    }

    public iTryToCallSentWith(params: Partial<ISentOutgoingRequestParameters>): void {
        params.requestId ??= this.context.givenLocalRequest!.id
        params.requestSourceObject ??= TestObjectFactory.createOutgoingMessage(this.context.currentIdentity)

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.sent(params as ISentOutgoingRequestParameters)
        }
    }

    public async iCallCanCreateForAnOutgoingRequest(
        params?: Partial<ICreateOutgoingRequestParameters>
    ): Promise<ValidationResult> {
        const realParams: ICreateOutgoingRequestParameters = {
            content: params?.content ?? {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: params?.peer ?? CoreAddress.from("id1")
        }

        this.context.validationResult = await this.context.outgoingRequestsController.canCreate(realParams)

        return this.context.validationResult
    }
    public constructor(private readonly context: RequestsTestsContext) {}

    public async iCreateAnOutgoingRequest(): Promise<void> {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: CoreAddress.from("id1")
        }

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.create(params)
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreationChange(): Promise<void> {
        await this.iCreateAnOutgoingRequestFromRelationshipCreationChangeWith({})
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreationChangeWith(
        params: Partial<ICreateOutgoingRequestFromRelationshipCreationChangeParameters>
    ): Promise<void> {
        params.template ??= TestObjectFactory.createOutgoingIRelationshipTemplate(
            this.context.currentIdentity,
            RelationshipTemplateBody.from({ onNewRelationship: TestObjectFactory.createRequestWithOneItem() })
        )
        params.creationChange ??= TestObjectFactory.createIncomingIRelationshipChange(RelationshipChangeType.Creation)

        this.context.localRequestAfterAction =
            await this.context.outgoingRequestsController.createFromRelationshipCreationChange(
                params as ICreateOutgoingRequestFromRelationshipCreationChangeParameters
            )
    }

    public async iCreateAnIncomingRequestWithSource(sourceObject: Message | RelationshipTemplate): Promise<void> {
        const request = TestObjectFactory.createRequestWithOneItem()

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.received({
            receivedRequest: request,
            requestSourceObject: sourceObject
        })
    }

    public async iCreateAnIncomingRequestWith(params: Partial<IReceivedIncomingRequestParameters>): Promise<void> {
        params.receivedRequest ??= TestObjectFactory.createRequestWithOneItem()
        params.requestSourceObject ??= TestObjectFactory.createIncomingMessage(this.context.currentIdentity)

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.received({
            receivedRequest: params.receivedRequest,
            requestSourceObject: params.requestSourceObject
        })
    }

    public iTryToCreateAnIncomingRequestWith(params: { sourceObject: Message | RelationshipTemplate }): Promise<void> {
        this.context.actionToTry = async () => await this.iCreateAnIncomingRequestWithSource(params.sourceObject)
        return Promise.resolve()
    }

    public async iCompleteTheIncomingRequest(): Promise<void> {
        await this.iCompleteTheIncomingRequestWith({})
    }

    public async iCompleteTheIncomingRequestWith(params: Partial<ICompleteIncomingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id
        this.context.localRequestAfterAction = await this.context.incomingRequestsController.complete(
            params as ICompleteIncomingRequestParameters
        )
    }

    public async iAcceptTheRequest(params?: Omit<DecideRequestParametersJSON, "requestId">): Promise<void> {
        params ??= {
            items: [
                {
                    accept: true
                }
            ]
        }

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.accept({
            requestId: this.context.givenLocalRequest!.id.toString(),
            ...params
        })
    }

    public async iRejectTheRequest(params?: Omit<DecideRequestParametersJSON, "requestId">): Promise<void> {
        params ??= {
            items: [
                {
                    accept: false
                }
            ]
        }

        this.context.localRequestAfterAction = await this.context.incomingRequestsController.reject({
            requestId: this.context.givenLocalRequest!.id.toString(),
            ...params
        })
    }

    public async iCompleteTheOutgoingRequest(): Promise<void> {
        const responseSource = TestObjectFactory.createIncomingMessage(this.context.currentIdentity)
        const responseContent = {
            result: ResponseResult.Accepted,
            requestId: this.context.givenLocalRequest!.id,
            items: [AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
        } as IResponse

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.complete({
            requestId: this.context.givenLocalRequest!.id,
            responseSourceObject: responseSource,
            receivedResponse: responseContent
        })
    }

    public async iCompleteTheOutgoingRequestWith(params: {
        requestId?: ICoreId
        responseSourceObject?: IMessage
        receivedResponse?: Omit<IResponse, "id">
    }): Promise<void> {
        params.requestId ??= this.context.givenLocalRequest!.id
        params.responseSourceObject ??= TestObjectFactory.createIncomingIMessage(this.context.currentIdentity)
        params.receivedResponse ??= TestObjectFactory.createResponse()

        params.receivedResponse.requestId = params.requestId

        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.complete(
            params as ICompleteOugoingRequestParameters
        )
    }

    public async iGetIncomingRequestsWithTheQuery(query?: any): Promise<void> {
        this.context.localRequestsAfterAction = await this.context.incomingRequestsController.getIncomingRequests(query)
    }

    public async iGetOutgoingRequestsWithTheQuery(query?: any): Promise<void> {
        this.context.localRequestsAfterAction = await this.context.outgoingRequestsController.getOutgoingRequests(query)
    }

    public async iGetTheIncomingRequestWith(id: CoreId): Promise<void> {
        this.context.localRequestAfterAction = await this.context.incomingRequestsController.getIncomingRequest(id)
    }

    public async iGetTheOutgoingRequestWith(id: CoreId): Promise<void> {
        this.context.localRequestAfterAction = await this.context.outgoingRequestsController.getOutgoingRequest(id)
    }

    public async iTryToGetARequestWithANonExistentId(): Promise<void> {
        this.context.localRequestAfterAction = (await this.context.incomingRequestsController.getIncomingRequest(
            await CoreId.generate()
        ))!
    }

    public iTryToCompleteTheIncomingRequestWith(params: Partial<ICompleteIncomingRequestParameters>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCompleteTheIncomingRequestWith(params)
        }

        return Promise.resolve()
    }

    public iTryToCompleteTheIncomingRequest(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCompleteTheIncomingRequest()
        }

        return Promise.resolve()
    }

    public iTryToCallCanCreateForAnOutgoingRequest(params: ICreateOutgoingRequestParameters): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.canCreate(params)
        }

        return Promise.resolve()
    }

    public iTryToAcceptARequestWithoutItemsParameters(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "REQ1"
        }

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }

    public iTryToRejectARequestWithoutItemsParameters(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "REQ1"
        }

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }

    public iTryToCreateAnOutgoingRequest(): void {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: CoreAddress.from("id1")
        }

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.create(params as any)
        }
    }

    public iTryToCreateAnOutgoingRequestWithoutContent(): Promise<void> {
        const paramsWithoutItems: Omit<ICreateOutgoingRequestParameters, "content"> = {
            peer: CoreAddress.from("id1")
        }

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.create(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }

    public iTryToCreateAnOutgoingRequestFromCreationChangeWithoutCreationChange(): Promise<void> {
        const paramsWithoutCreationChange: Omit<
            ICreateOutgoingRequestFromRelationshipCreationChangeParameters,
            "creationChange"
        > = {
            template: TestObjectFactory.createOutgoingIRelationshipTemplate(this.context.currentIdentity)
        }

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.createFromRelationshipCreationChange(
                paramsWithoutCreationChange as any
            )
        }

        return Promise.resolve()
    }

    public iTryToRejectARequestWithSyntacticallyInvalidInput(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "REQ1"
        }

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.reject(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }
}

export class RequestsThen {
    public applyIncomingResponseItemIsCalledOnTheRequestItemProcessor(numberOfCalls: number): Promise<void> {
        expect(TestRequestItemProcessor.numberOfApplyIncomingResponseItemCalls).to.equal(numberOfCalls)
        return Promise.resolve()
    }
    public constructor(private readonly context: RequestsTestsContext) {}

    public canCreateIsBeingCalled(): Promise<void> {
        expect(this.context.canCreateWasCalled).to.equal(true)
        return Promise.resolve()
    }

    public theNumberOfReturnedRequestsIs(n: number): Promise<void> {
        expect(this.context.localRequestsAfterAction).to.have.lengthOf(n)
        return Promise.resolve()
    }

    public theReturnedRequestHasTheId(id: CoreId): Promise<void> {
        expect(this.context.localRequestAfterAction).to.exist
        expect(this.context.localRequestAfterAction!.id.toString()).to.equal(id.toString())
        return Promise.resolve()
    }

    public iExpectUndefinedToBeReturned(): Promise<void> {
        expect(this.context.localRequestAfterAction).to.be.undefined
        return Promise.resolve()
    }

    public theCreatedRequestHasAllProperties(
        createdBy: CoreAddress,
        sourceId: CoreId,
        sourceType: "Message" | "RelationshipTemplate"
    ): Promise<void> {
        expect(this.context.localRequestAfterAction).to.be.instanceOf(LocalRequest)
        expect(this.context.localRequestAfterAction!.id).to.exist
        expect(this.context.localRequestAfterAction!.isOwn).to.be.false
        expect(this.context.localRequestAfterAction!.peer.toString()).to.equal(createdBy.toString())
        expect(this.context.localRequestAfterAction!.source).to.exist
        expect(this.context.localRequestAfterAction!.source!.reference.toString()).to.equal(sourceId.toString())
        expect(this.context.localRequestAfterAction!.source!.type).to.equal(sourceType)
        expect(this.context.localRequestAfterAction!.response).to.be.undefined
        expect(this.context.localRequestAfterAction!.statusLog).to.be.empty

        return Promise.resolve()
    }

    public theCreatedOutgoingRequestHasAllProperties(): Promise<void> {
        expect(this.context.localRequestAfterAction).to.exist

        expect(this.context.localRequestAfterAction!.id).to.exist
        expect(this.context.localRequestAfterAction!.createdAt).to.exist
        expect(this.context.localRequestAfterAction!.isOwn).to.equal(true)

        return Promise.resolve()
    }

    public theRequestHasItsResponsePropertySetCorrectly(expectedResult: ResponseItemResult): Promise<void> {
        expect(this.context.localRequestAfterAction!.response).to.exist
        expect(this.context.localRequestAfterAction!.response).to.be.instanceOf(LocalResponse)
        expect(this.context.localRequestAfterAction!.response!.content).to.be.instanceOf(Response)
        expect(this.context.localRequestAfterAction!.response!.content.requestId.toString()).to.equal(
            (this.context.localRequestAfterAction ?? this.context.givenLocalRequest!).id.toString()
        )
        expect(this.context.localRequestAfterAction?.response!.content.result).to.equal(expectedResult)

        return Promise.resolve()
    }

    public theResponseHasItsSourcePropertySetCorrectly(expectedProperties: {
        responseSourceType: string
    }): Promise<void> {
        expect(this.context.localRequestAfterAction!.response!.source).to.exist
        expect(this.context.localRequestAfterAction!.response!.source!.reference).to.exist
        expect(this.context.localRequestAfterAction!.response!.source!.type).to.equal(
            expectedProperties.responseSourceType
        )

        return Promise.resolve()
    }

    public theResponseHasItsSourcePropertyNotSet(): Promise<void> {
        expect(this.context.localRequestAfterAction!.response!.source).to.not.exist

        return Promise.resolve()
    }

    public theRequestHasItsSourcePropertySet(): Promise<void> {
        expect(this.context.localRequestAfterAction!.source).to.exist
        expect(this.context.localRequestAfterAction!.source).to.be.instanceOf(LocalRequestSource)
        expect(this.context.localRequestAfterAction!.source!.reference).to.be.instanceOf(CoreId)

        return Promise.resolve()
    }

    public theRequestHasItsSourcePropertySetTo(expectedSource: ILocalRequestSource): Promise<void> {
        expect(this.context.localRequestAfterAction!.source).to.exist
        expect(this.context.localRequestAfterAction!.source).to.be.instanceOf(LocalRequestSource)
        expect(this.context.localRequestAfterAction!.source!.reference.toString()).to.equal(expectedSource.reference.id)
        expect(this.context.localRequestAfterAction!.source!.type).to.equal(expectedSource.type)

        return Promise.resolve()
    }

    public theRequestIsInStatus(status: LocalRequestStatus): Promise<void> {
        expect(this.context.localRequestAfterAction!.status).to.equal(status)
        return Promise.resolve()
    }

    public theRequestDoesNotHaveSourceSet(): Promise<void> {
        expect(this.context.localRequestAfterAction!.source).to.be.undefined
        return Promise.resolve()
    }

    public theRequestMovesToStatus(status: LocalRequestStatus): Promise<void> {
        const modifiedRequest = this.context.localRequestAfterAction!

        expect(modifiedRequest.status).to.equal(status)

        const statusLogEntry = modifiedRequest.statusLog[modifiedRequest.statusLog.length - 1]
        expect(statusLogEntry.newStatus).to.equal(status)

        return Promise.resolve()
    }

    public itReturnsASuccessfulValidationResult(): Promise<void> {
        expect(this.context.validationResult!.isSuccess()).to.be.true
        return Promise.resolve()
    }

    public itReturnsAnErrorValidationResult(): Promise<void> {
        expect(this.context.validationResult!.isError()).to.be.true
        return Promise.resolve()
    }

    public async theNewRequestIsPersistedInTheDatabase(): Promise<void> {
        const requestDoc = await this.context.requestsCollection.read(
            this.context.localRequestAfterAction!.id.toString()
        )
        const requestInDatabase = LocalRequest.from(requestDoc)

        expect(requestInDatabase).to.exist
        expect(requestInDatabase.toJSON()).to.deep.equal(this.context.localRequestAfterAction!.toJSON())
    }

    public async theChangesArePersistedInTheDatabase(): Promise<void> {
        const requestDoc = await this.context.requestsCollection.read(
            this.context.localRequestAfterAction!.id.toString()
        )
        const requestInDatabase = LocalRequest.from(requestDoc)

        expect(requestInDatabase.toJSON()).to.deep.equal(this.context.localRequestAfterAction!.toJSON())
    }

    public theRequestHasTheId(id: CoreId | string): Promise<void> {
        expect(this.context.localRequestAfterAction!.id.toString()).to.equal(id.toString())
        return Promise.resolve()
    }

    public iExpectTheResponseContent(customExpects: (responseContent: Response) => void): Promise<void> {
        customExpects(this.context.localRequestAfterAction!.response!.content)
        return Promise.resolve()
    }

    public async itThrowsAnErrorWithTheErrorMessage(errorMessage: string): Promise<void> {
        await TestUtil.expectThrowsAsync(this.context.actionToTry!, errorMessage)
    }

    public async itThrowsAnErrorWithTheErrorCode(code: string): Promise<void> {
        await TestUtil.expectThrowsAsync(this.context.actionToTry!, (error: Error) => {
            expect((error as any).code).to.be.equal(code)
        })
    }

    public eventHasBeenPublished<TEvent extends DataEvent<unknown>>(
        eventConstructor: (new (...args: any[]) => TEvent) & { namespace: string },
        data?: Partial<TEvent extends DataEvent<infer X> ? X : never>
    ): Promise<void> {
        this.context.mockEventBus.expectLastPublishedEvent(eventConstructor, data)
        return Promise.resolve()
    }

    public eventsHaveBeenPublished(
        ...eventContructors: ((new (...args: any[]) => DataEvent<unknown>) & { namespace: string })[]
    ): Promise<void> {
        this.context.mockEventBus.expectPublishedEvents(...eventContructors)
        return Promise.resolve()
    }
}

function isStatusAAfterStatusB(a: LocalRequestStatus, b: LocalRequestStatus): boolean {
    return getIntegerValue(a) > getIntegerValue(b)
}

function getIntegerValue(status: LocalRequestStatus): number {
    switch (status) {
        case LocalRequestStatus.Draft:
            return 0
        case LocalRequestStatus.Open:
            return 1
        case LocalRequestStatus.DecisionRequired:
            return 2
        case LocalRequestStatus.ManualDecisionRequired:
            return 3
        case LocalRequestStatus.Decided:
            return 5
        case LocalRequestStatus.Completed:
            return 6
    }
}
