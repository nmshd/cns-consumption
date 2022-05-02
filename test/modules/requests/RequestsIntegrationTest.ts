import { IDatabaseCollection, IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import {
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestSource,
    ConsumptionRequestStatus,
    ConsumptionResponse,
    DecideRequestParametersJSON,
    ICheckPrerequisitesOfIncomingRequestParameters,
    ICompleteIncomingRequestParameters,
    ICompleteOugoingRequestParameters,
    IConsumptionRequestSource,
    ICreateOutgoingRequestFromRelationshipCreationChangeParameters,
    ICreateOutgoingRequestParameters,
    IncomingRequestsController,
    IReceivedIncomingRequestParameters,
    IRequireManualDecisionOfIncomingRequestParameters,
    ISentOutgoingRequestParameters,
    OutgoingRequestsController,
    ReceivedIncomingRequestParameters,
    ValidationResult
} from "@nmshd/consumption"
import {
    AcceptResponseItem,
    IRequest,
    IResponse,
    Request,
    RequestItemGroup,
    Response,
    ResponseItemResult,
    ResponseResult
} from "@nmshd/content"
import {
    CoreAddress,
    CoreId,
    IConfigOverwrite,
    ICoreId,
    IMessage,
    Message,
    RelationshipChangeType,
    RelationshipTemplate
} from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
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
    public readonly requestsCollection: IDatabaseCollection
    // public readonly incomingRequestsController: IncomingRequestsController
    // public readonly outgoingRequestsController: OutgoingRequestsController
    public constructor(
        public readonly address: CoreAddress,
        public readonly incomingRequestsController: IncomingRequestsController,
        public readonly outgoingRequestsController: OutgoingRequestsController
    ) {
        // this.incomingRequestsController = consumptionController.incomingRequests
        // this.outgoingRequestsController = consumptionController.outgoingRequests

        this.requestsCollection = incomingRequestsController.requestsCollection

        const originalCanCreate = this.outgoingRequestsController.canCreate
        this.outgoingRequestsController.canCreate = (params: ICreateOutgoingRequestParameters) => {
            this.canCreateWasCalled = true
            return originalCanCreate.call(this.outgoingRequestsController, params)
        }
    }

    public reset(): void {
        this.canCreateWasCalled = false
        this.givenConsumptionRequest = undefined
        this.consumptionRequestAfterAction = undefined
        this.validationResult = undefined
        this.actionToTry = undefined

        TestRequestItemProcessor.numberOfApplyIncomingResponseItemCalls = 0
    }

    public givenConsumptionRequest?: ConsumptionRequest
    public consumptionRequestAfterAction?: ConsumptionRequest
    public consumptionRequestsAfterAction?: ConsumptionRequest[]
    public validationResult?: ValidationResult
    public canCreateWasCalled = false
    public actionToTry?: () => Promise<void>
}

export class RequestsGiven {
    public constructor(private readonly context: RequestsTestsContext) {}

    public async anIncomingRequest(): Promise<ConsumptionRequest> {
        return await this.anIncomingRequestWith({})
    }

    public async anIncomingRequestWithAnItemAndAGroupInStatus(status: ConsumptionRequestStatus): Promise<void> {
        const content = Request.from({
            "@type": "Request",
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false,
                    responseMetadata: {
                        outerItemMetaKey: "outerItemMetaValue"
                    }
                }),
                RequestItemGroup.from({
                    "@type": "RequestItemGroup",
                    mustBeAccepted: false,
                    responseMetadata: {
                        groupMetaKey: "groupMetaValue"
                    },
                    items: [
                        TestRequestItem.from({
                            responseMetadata: {
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
        status?: ConsumptionRequestStatus
    }): Promise<ConsumptionRequest> {
        params.id ??= await ConsumptionIds.request.generate()
        params.content ??= TestObjectFactory.createRequestWithOneItem({ id: params.id })
        params.status ??= ConsumptionRequestStatus.Open

        const requestSource = TestObjectFactory.createIncomingMessage(this.context.address)

        const consumptionRequest = await this.context.incomingRequestsController.received({
            receivedRequest: params.content,
            requestSourceObject: requestSource
        })

        await this.moveIncomingRequestToStatus(consumptionRequest, params.status)

        this.context.givenConsumptionRequest = consumptionRequest

        return consumptionRequest
    }

    public async anIncomingRequestInStatus(status: ConsumptionRequestStatus): Promise<void> {
        await this.anIncomingRequestWith({ status: status })
    }

    private async moveIncomingRequestToStatus(
        consumptionRequest: ConsumptionRequest,
        status: ConsumptionRequestStatus
    ) {
        if (consumptionRequest.status === status) return

        if (isStatusAAfterStatusB(status, consumptionRequest.status)) {
            consumptionRequest = await this.context.incomingRequestsController.checkPrerequisites({
                requestId: consumptionRequest.id
            })
        }

        if (isStatusAAfterStatusB(status, consumptionRequest.status)) {
            consumptionRequest = await this.context.incomingRequestsController.accept({
                requestId: consumptionRequest.id.toString(),
                items: [
                    {
                        accept: true
                    }
                ]
            })
        }

        if (isStatusAAfterStatusB(status, consumptionRequest.status)) {
            consumptionRequest = await this.context.incomingRequestsController.complete({
                requestId: consumptionRequest.id,
                responseSourceObject: TestObjectFactory.createOutgoingIMessage(this.context.address)
            })
        }
    }

    public async anOutgoingRequest(): Promise<ConsumptionRequest> {
        return await this.anOutgoingRequestWith({})
    }

    public async anOutgoingRequestInStatus(status: ConsumptionRequestStatus): Promise<void> {
        await this.anOutgoingRequestWith({ status: status })
    }

    public async anOutgoingRequestWith(params: {
        status?: ConsumptionRequestStatus
        content?: IRequest
    }): Promise<ConsumptionRequest> {
        params.status ??= ConsumptionRequestStatus.Open
        params.content ??= {
            items: [
                TestRequestItem.from({
                    mustBeAccepted: false
                })
            ]
        }

        this.context.givenConsumptionRequest = await this.context.outgoingRequestsController.create({
            content: params.content,
            peer: CoreAddress.from("id1")
        })

        await this.moveOutgoingRequestToStatus(this.context.givenConsumptionRequest, params.status)

        return this.context.givenConsumptionRequest
    }

    private async moveOutgoingRequestToStatus(
        consumptionRequest: ConsumptionRequest,
        status: ConsumptionRequestStatus
    ) {
        if (consumptionRequest.status === status) return

        if (isStatusAAfterStatusB(status, ConsumptionRequestStatus.Draft)) {
            await this.context.outgoingRequestsController.sent({
                requestId: consumptionRequest.id,
                requestSourceObject: TestObjectFactory.createOutgoingIMessage(this.context.address)
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
        params.requestId ??= this.context.givenConsumptionRequest!.id.toString()

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
        params.requestId ??= this.context.givenConsumptionRequest!.id.toString()

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
        params.requestId ??= this.context.givenConsumptionRequest!.id
        this.context.consumptionRequestAfterAction =
            await this.context.incomingRequestsController.requireManualDecision(
                params as IRequireManualDecisionOfIncomingRequestParameters
            )
    }

    public iTryToAccept(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept({
                requestId: this.context.givenConsumptionRequest!.id.toString(),
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
        params.requestId ??= this.context.givenConsumptionRequest!.id.toString()
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
                requestId: this.context.givenConsumptionRequest!.id.toString(),
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
        params.requestId ??= this.context.givenConsumptionRequest!.id.toString()
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
        params.requestId ??= this.context.givenConsumptionRequest?.id

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.checkPrerequisites(
            params as ICheckPrerequisitesOfIncomingRequestParameters
        )
    }

    public iTryToCallSentWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.sent({
                requestId: this.context.givenConsumptionRequest!.id,
                requestSourceObject: undefined
            } as any)
        }
        return Promise.resolve()
    }

    public async iCallSent(): Promise<void> {
        await this.iCallSentWith({})
    }

    public async iCallSentWith(params: Partial<ISentOutgoingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.requestSourceObject ??= TestObjectFactory.createOutgoingMessage(this.context.address)

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.sent({
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
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.responseSourceObject ??= TestObjectFactory.createIncomingIMessage(this.context.address)
        params.receivedResponse ??= TestObjectFactory.createResponse()

        params.receivedResponse.requestId = params.requestId

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete(params as ICompleteOugoingRequestParameters)
        }
    }

    public iTryToCallCompleteWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete({
                requestId: this.context.givenConsumptionRequest!.id,
                receivedResponse: TestObjectFactory.createResponse()
            } as any)
        }

        return Promise.resolve()
    }

    public iTryToCallSent(): void {
        this.iTryToCallSentWith({})
    }

    public iTryToCallSentWith(params: Partial<ISentOutgoingRequestParameters>): void {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.requestSourceObject ??= TestObjectFactory.createOutgoingMessage(this.context.address)

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

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.create(params)
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreationChange(): Promise<void> {
        await this.iCreateAnOutgoingRequestFromRelationshipCreationChangeWith({})
    }

    public async iCreateAnOutgoingRequestFromRelationshipCreationChangeWith(
        params: Partial<ICreateOutgoingRequestFromRelationshipCreationChangeParameters>
    ): Promise<void> {
        params.template ??= TestObjectFactory.createOutgoingIRelationshipTemplate(
            this.context.address,
            TestObjectFactory.createRequestWithOneItem()
        )
        params.creationChange ??= TestObjectFactory.createIncomingIRelationshipChange(RelationshipChangeType.Creation)

        this.context.consumptionRequestAfterAction =
            await this.context.outgoingRequestsController.createFromRelationshipCreationChange(
                params as ICreateOutgoingRequestFromRelationshipCreationChangeParameters
            )
    }

    public async iCreateAnIncomingRequestWithSource(sourceObject: Message | RelationshipTemplate): Promise<void> {
        const request = TestObjectFactory.createRequestWithOneItem()

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.received({
            receivedRequest: request,
            requestSourceObject: sourceObject
        })
    }

    public async iCreateAnIncomingRequestWith(params: Partial<IReceivedIncomingRequestParameters>): Promise<void> {
        params.receivedRequest ??= TestObjectFactory.createRequestWithOneItem()
        params.requestSourceObject ??= TestObjectFactory.createIncomingMessage(this.context.address)

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.received({
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
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.responseSourceObject ??= TestObjectFactory.createOutgoingIMessage(this.context.address)
        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.complete(
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

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.accept({
            requestId: this.context.givenConsumptionRequest!.id.toString(),
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

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.reject({
            requestId: this.context.givenConsumptionRequest!.id.toString(),
            ...params
        })
    }

    public async iCompleteTheOutgoingRequest(): Promise<void> {
        const responseSource = TestObjectFactory.createIncomingMessage(this.context.address)
        const responseContent = {
            result: ResponseResult.Accepted,
            requestId: this.context.givenConsumptionRequest!.id,
            items: [AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
        } as IResponse

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.complete({
            requestId: this.context.givenConsumptionRequest!.id,
            responseSourceObject: responseSource,
            receivedResponse: responseContent
        })
    }

    public async iCompleteTheOutgoingRequestWith(params: {
        requestId?: ICoreId
        responseSourceObject?: IMessage
        receivedResponse?: Omit<IResponse, "id">
    }): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.responseSourceObject ??= TestObjectFactory.createIncomingIMessage(this.context.address)
        params.receivedResponse ??= TestObjectFactory.createResponse()

        params.receivedResponse.requestId = params.requestId

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.complete(
            params as ICompleteOugoingRequestParameters
        )
    }

    public async iGetIncomingRequestsWithTheQuery(query?: any): Promise<void> {
        this.context.consumptionRequestsAfterAction = await this.context.incomingRequestsController.getIncomingRequests(
            query
        )
    }

    public async iGetTheIncomingRequestWith(id: CoreId): Promise<void> {
        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.get(id)
    }

    public async iGetTheOutgoingRequestWith(id: CoreId): Promise<void> {
        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.get(id)
    }

    public async iTryToGetARequestWithANonExistentId(): Promise<void> {
        this.context.consumptionRequestAfterAction = (await this.context.incomingRequestsController.get(
            await CoreId.generate()
        ))!
    }

    public iTryToCompleteTheIncomingRequestWithoutResponseSource(): Promise<void> {
        this.context.actionToTry = async () => {
            this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.complete({
                requestId: this.context.givenConsumptionRequest!.id
            } as any)
        }

        return Promise.resolve()
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
            requestId: "CNSREQ1"
        }

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }

    public iTryToRejectARequestWithoutItemsParameters(): Promise<void> {
        const paramsWithoutItems: Omit<DecideRequestParametersJSON, "items"> = {
            requestId: "CNSREQ1"
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
            template: TestObjectFactory.createOutgoingIRelationshipTemplate(this.context.address)
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
            requestId: "CNSREQ1"
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
        expect(this.context.consumptionRequestsAfterAction).to.have.lengthOf(n)
        return Promise.resolve()
    }

    public theReturnedRequestHasTheId(id: CoreId): Promise<void> {
        expect(this.context.consumptionRequestAfterAction).to.exist
        expect(this.context.consumptionRequestAfterAction!.id.toString()).to.equal(id.toString())
        return Promise.resolve()
    }

    public iExpectUndefinedToBeReturned(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction).to.be.undefined
        return Promise.resolve()
    }

    public theCreatedRequestHasAllProperties(
        createdBy: CoreAddress,
        sourceId: CoreId,
        sourceType: "Message" | "RelationshipTemplate"
    ): Promise<void> {
        expect(this.context.consumptionRequestAfterAction).to.be.instanceOf(ConsumptionRequest)
        expect(this.context.consumptionRequestAfterAction!.id).to.exist
        expect(this.context.consumptionRequestAfterAction!.isOwn).to.be.false
        expect(this.context.consumptionRequestAfterAction!.peer.toString()).to.equal(createdBy.toString())
        expect(this.context.consumptionRequestAfterAction!.source).to.exist
        expect(this.context.consumptionRequestAfterAction!.source!.reference.toString()).to.equal(sourceId.toString())
        expect(this.context.consumptionRequestAfterAction!.source!.type).to.equal(sourceType)
        expect(this.context.consumptionRequestAfterAction!.response).to.be.undefined
        expect(this.context.consumptionRequestAfterAction!.statusLog).to.be.empty

        return Promise.resolve()
    }

    public theCreatedOutgoingRequestHasAllProperties(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction).to.exist

        expect(this.context.consumptionRequestAfterAction!.id).to.exist
        expect(this.context.consumptionRequestAfterAction!.createdAt).to.exist
        expect(this.context.consumptionRequestAfterAction!.isOwn).to.equal(true)

        return Promise.resolve()
    }

    public theRequestHasItsResponsePropertySetCorrectly(expectedResult: ResponseItemResult): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.response).to.exist
        expect(this.context.consumptionRequestAfterAction!.response).to.be.instanceOf(ConsumptionResponse)
        expect(this.context.consumptionRequestAfterAction!.response!.content).to.be.instanceOf(Response)
        expect(this.context.consumptionRequestAfterAction!.response!.content.requestId.toString()).to.equal(
            (this.context.consumptionRequestAfterAction ?? this.context.givenConsumptionRequest!).id.toString()
        )
        expect(this.context.consumptionRequestAfterAction?.response!.content.result).to.equal(expectedResult)

        return Promise.resolve()
    }

    public theResponseHasItsSourcePropertySetCorrectly(expectedProperties: {
        responseSourceType: string
    }): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.response!.source).to.exist
        expect(this.context.consumptionRequestAfterAction!.response!.source!.reference).to.be.exist
        expect(this.context.consumptionRequestAfterAction!.response!.source!.type).to.equal(
            expectedProperties.responseSourceType
        )

        return Promise.resolve()
    }

    public theRequestHasItsSourcePropertySet(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.source).to.exist
        expect(this.context.consumptionRequestAfterAction!.source).to.be.instanceOf(ConsumptionRequestSource)
        expect(this.context.consumptionRequestAfterAction!.source!.reference).to.be.instanceOf(CoreId)

        return Promise.resolve()
    }

    public theRequestHasItsSourcePropertySetTo(expectedSource: IConsumptionRequestSource): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.source).to.exist
        expect(this.context.consumptionRequestAfterAction!.source).to.be.instanceOf(ConsumptionRequestSource)
        expect(this.context.consumptionRequestAfterAction!.source!.reference.toString()).to.equal(
            expectedSource.reference.id
        )
        expect(this.context.consumptionRequestAfterAction!.source!.type).to.equal(expectedSource.type)

        return Promise.resolve()
    }

    public theRequestIsInStatus(status: ConsumptionRequestStatus): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.status).to.equal(status)
        return Promise.resolve()
    }

    public theRequestDoesNotHaveSourceSet(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.source).to.be.undefined
        return Promise.resolve()
    }

    public theRequestMovesToStatus(status: ConsumptionRequestStatus): Promise<void> {
        const modifiedRequest = this.context.consumptionRequestAfterAction!

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
            this.context.consumptionRequestAfterAction!.id.toString()
        )
        const requestInDatabase = ConsumptionRequest.from(requestDoc)

        expect(requestInDatabase).to.exist
        expect(requestInDatabase.toJSON()).to.deep.equal(this.context.consumptionRequestAfterAction!.toJSON())
    }

    public async theChangesArePersistedInTheDatabase(): Promise<void> {
        const requestDoc = await this.context.requestsCollection.read(
            this.context.consumptionRequestAfterAction!.id.toString()
        )
        const requestInDatabase = ConsumptionRequest.from(requestDoc)

        expect(requestInDatabase.toJSON()).to.deep.equal(this.context.consumptionRequestAfterAction!.toJSON())
    }

    public theRequestHasTheId(id: CoreId | string): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.id.toString()).to.equal(id.toString())
        return Promise.resolve()
    }

    public iExpectTheResponseContent(customExpects: (responseContent: Response) => void): Promise<void> {
        customExpects(this.context.consumptionRequestAfterAction!.response!.content)
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
}

function isStatusAAfterStatusB(a: ConsumptionRequestStatus, b: ConsumptionRequestStatus): boolean {
    return getIntegerValue(a) > getIntegerValue(b)
}

function getIntegerValue(status: ConsumptionRequestStatus): number {
    switch (status) {
        case ConsumptionRequestStatus.Draft:
            return 0
        case ConsumptionRequestStatus.Open:
            return 1
        case ConsumptionRequestStatus.DecisionRequired:
            return 2
        case ConsumptionRequestStatus.ManualDecisionRequired:
            return 3
        case ConsumptionRequestStatus.Decided:
            return 5
        case ConsumptionRequestStatus.Completed:
            return 6
    }
}
