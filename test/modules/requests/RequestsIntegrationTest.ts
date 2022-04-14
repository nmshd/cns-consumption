import { IDatabaseCollection, IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import {
    AcceptRequestItemParameters,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestSource,
    ConsumptionRequestStatus,
    ConsumptionResponse,
    IAcceptRequestParameters,
    ICheckPrerequisitesOfOutgoingRequestParameters,
    ICompleteOugoingRequestParameters,
    IConsumptionRequestSource,
    ICreateOutgoingRequestParameters,
    IncomingRequestsController,
    IReceivedIncomingRequestParameters,
    IRejectRequestParameters,
    IRequireManualDecisionParams,
    ISentOutgoingRequestParameters,
    OutgoingRequestsController,
    RejectRequestItemParameters,
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
    AccountController,
    CoreAddress,
    CoreId,
    IConfigOverwrite,
    ICoreId,
    IMessage,
    Message,
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
    public readonly requestsCollection: IDatabaseCollection // TODO: use for Givens??
    public readonly incomingRequestsController: IncomingRequestsController
    public readonly outgoingRequestsController: OutgoingRequestsController
    public constructor(
        public readonly accountController: AccountController,
        public readonly consumptionController: ConsumptionController
    ) {
        this.incomingRequestsController = consumptionController.incomingRequests
        this.outgoingRequestsController = consumptionController.outgoingRequests

        this.requestsCollection = (consumptionController.outgoingRequests as any)
            .consumptionRequests as IDatabaseCollection

        const oldCanCreate = this.consumptionController.outgoingRequests.canCreate
        this.consumptionController.outgoingRequests.canCreate = (params: ICreateOutgoingRequestParameters) => {
            this.canCreateWasCalled = true
            return oldCanCreate.call(this.consumptionController.outgoingRequests, params)
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
        const content = await Request.from({
            "@type": "Request",
            items: [
                await TestRequestItem.from({
                    mustBeAccepted: false,
                    responseMetadata: {
                        outerItemMetaKey: "outerItemMetaValue"
                    }
                }),
                await RequestItemGroup.from({
                    "@type": "RequestItemGroup",
                    mustBeAccepted: false,
                    responseMetadata: {
                        groupMetaKey: "groupMetaValue"
                    },
                    items: [
                        await TestRequestItem.from({
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
        params.content ??= await TestObjectFactory.createRequestWithOneItem({ id: params.id })
        params.status ??= ConsumptionRequestStatus.Open

        const requestSource = await TestObjectFactory.createIncomingMessage(
            this.context.accountController.identity.address
        )

        const consumptionRequest = await this.context.incomingRequestsController.received({
            content: params.content,
            sourceObject: requestSource
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
                requestId: consumptionRequest.id,
                items: [AcceptRequestItemParameters.from({})]
            })
        }

        if (isStatusAAfterStatusB(status, consumptionRequest.status)) {
            consumptionRequest = await this.context.incomingRequestsController.complete(consumptionRequest.id)
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
                await TestRequestItem.from({
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
                sourceObject: TestObjectFactory.createOutgoingIMessage(this.context.accountController.identity.address)
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
            await this.context.incomingRequestsController.canAccept({} as IAcceptRequestParameters)
        }
        return Promise.resolve()
    }

    public iTryToCallCanAcceptWith(params: Partial<IAcceptRequestParameters>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCallCanAcceptWith(params)
        }
        return Promise.resolve()
    }

    public async iCallCanAcceptWith(params: Partial<IAcceptRequestParameters>): Promise<ValidationResult> {
        params.items ??= [AcceptRequestItemParameters.from({})]
        params.requestId ??= this.context.givenConsumptionRequest!.id

        this.context.validationResult = await this.context.incomingRequestsController.canAccept(
            params as IAcceptRequestParameters
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
            await this.context.incomingRequestsController.requireManualDecision({} as IRequireManualDecisionParams)
        }

        return Promise.resolve()
    }

    public iTryToRequireManualDecisionWith(params: Partial<IRequireManualDecisionParams>): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iRequireManualDecisionWith(params)
        }

        return Promise.resolve()
    }

    public async iRequireManualDecisionWith(params: Partial<IRequireManualDecisionParams>): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        this.context.consumptionRequestAfterAction =
            await this.context.incomingRequestsController.requireManualDecision(params as IRequireManualDecisionParams)
    }

    public iTryToAccept(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept({
                requestId: this.context.givenConsumptionRequest!.id,
                items: [AcceptRequestItemParameters.from({})]
            })
        }
        return Promise.resolve()
    }
    public async iCheckPrerequisites(): Promise<void> {
        await this.iCheckPrerequisitesWith({})
    }

    public async iTryToCheckPrerequisites(): Promise<void> {
        await this.iTryToCheckPrerequisitesWith({})
    }

    public iTryToCheckPrerequisitesWith(
        params: Partial<ICheckPrerequisitesOfOutgoingRequestParameters>
    ): Promise<void> {
        this.context.actionToTry = async () => {
            await this.iCheckPrerequisitesWith(params as ICheckPrerequisitesOfOutgoingRequestParameters)
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
        params: Partial<ICheckPrerequisitesOfOutgoingRequestParameters>
    ): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest?.id

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.checkPrerequisites(
            params as ICheckPrerequisitesOfOutgoingRequestParameters
        )
    }

    public iTryToCallSentWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.sent({
                requestId: this.context.givenConsumptionRequest!.id,
                sourceObject: undefined
            } as any)
        }
        return Promise.resolve()
    }

    public async iCallSent(): Promise<void> {
        await this.iCallSentWith({})
    }

    public async iCallSentWith(params: Partial<ISentOutgoingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.sourceObject ??= await TestObjectFactory.createOutgoingMessage(
            this.context.accountController.identity.address
        )

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.sent({
            requestId: params.requestId,
            sourceObject: params.sourceObject
        })
    }

    public async iTryToCompleteTheOutgoingRequest(): Promise<void> {
        await this.iTryToCompleteTheOutgoingRequestWith({})
    }

    public async iTryToCompleteTheOutgoingRequestWith(params: {
        requestId?: ICoreId
        sourceObject?: IMessage
        response?: Omit<IResponse, "id">
    }): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.sourceObject ??= TestObjectFactory.createIncomingIMessage(
            this.context.accountController.identity.address
        )
        params.response ??= await TestObjectFactory.createResponse()

        params.response.requestId = params.requestId

        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete(params as ICompleteOugoingRequestParameters)
        }
    }

    public iTryToCallCompleteWithoutSourceObject(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.outgoingRequestsController.complete({
                requestId: this.context.givenConsumptionRequest!.id,
                response: await TestObjectFactory.createResponse()
            } as any)
        }

        return Promise.resolve()
    }

    public async iTryToCallSent(): Promise<void> {
        await this.iTryToCallSentWith({})
    }

    public async iTryToCallSentWith(params: Partial<ISentOutgoingRequestParameters>): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.sourceObject ??= await TestObjectFactory.createOutgoingMessage(
            this.context.accountController.identity.address
        )

        this.context.actionToTry = async () =>
            await this.context.outgoingRequestsController.sent(params as ISentOutgoingRequestParameters)
    }

    public async iCallCanCreateForAnOutgoingRequest(
        params?: Partial<ICreateOutgoingRequestParameters>
    ): Promise<ValidationResult> {
        const realParams: ICreateOutgoingRequestParameters = {
            content: params?.content ?? {
                items: [
                    await TestRequestItem.from({
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
                    await TestRequestItem.from({
                        mustBeAccepted: false
                    })
                ]
            },
            peer: CoreAddress.from("id1")
        }

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.create(params)
    }

    public async iCreateAnIncomingRequestWithSource(sourceObject: Message | RelationshipTemplate): Promise<void> {
        const request = await TestObjectFactory.createRequestWithOneItem()

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.received({
            content: request,
            sourceObject: sourceObject
        })
    }

    public async iCreateAnIncomingRequestWith(params: Partial<IReceivedIncomingRequestParameters>): Promise<void> {
        params.content ??= await TestObjectFactory.createRequestWithOneItem()
        params.sourceObject ??= await TestObjectFactory.createIncomingMessage(
            this.context.accountController.identity.address
        )

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.received({
            content: params.content,
            sourceObject: params.sourceObject
        })
    }

    public iTryToCreateAnIncomingRequestWith(params: { sourceObject: Message | RelationshipTemplate }): Promise<void> {
        this.context.actionToTry = async () => await this.iCreateAnIncomingRequestWithSource(params.sourceObject)
        return Promise.resolve()
    }

    public async iCompleteTheRequest(): Promise<void> {
        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.complete(
            this.context.givenConsumptionRequest!.id
        )
    }

    public async iAcceptTheRequest(params?: Omit<IAcceptRequestParameters, "requestId">): Promise<void> {
        params ??= {
            items: [AcceptRequestItemParameters.from({})]
        }

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.accept({
            requestId: this.context.givenConsumptionRequest!.id,
            ...params
        })
    }

    public async iRejectTheRequest(params?: Omit<IAcceptRequestParameters, "requestId">): Promise<void> {
        params ??= {
            items: [RejectRequestItemParameters.from({})]
        }

        this.context.consumptionRequestAfterAction = await this.context.incomingRequestsController.reject({
            requestId: this.context.givenConsumptionRequest!.id,
            ...params
        })
    }

    public async iCompleteTheOutgoingRequest(): Promise<void> {
        const responseSource = await TestObjectFactory.createIncomingMessage(
            this.context.accountController.identity.address
        )
        const responseContent = {
            result: ResponseResult.Accepted,
            requestId: this.context.givenConsumptionRequest!.id,
            items: [await AcceptResponseItem.from({ result: ResponseItemResult.Accepted })]
        } as IResponse

        this.context.consumptionRequestAfterAction = await this.context.outgoingRequestsController.complete({
            requestId: this.context.givenConsumptionRequest!.id,
            sourceObject: responseSource,
            response: responseContent
        })
    }

    public async iCompleteTheOutgoingRequestWith(params: {
        requestId?: ICoreId
        sourceObject?: IMessage
        response?: Omit<IResponse, "id">
    }): Promise<void> {
        params.requestId ??= this.context.givenConsumptionRequest!.id
        params.sourceObject ??= TestObjectFactory.createIncomingIMessage(
            this.context.accountController.identity.address
        )
        params.response ??= await TestObjectFactory.createResponse()

        params.response.requestId = params.requestId

        await this.context.outgoingRequestsController.complete(params as ICompleteOugoingRequestParameters)
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

    public iTryToCompleteTheRequest(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.complete(this.context.givenConsumptionRequest!.id)
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
        const paramsWithoutItems: Omit<IAcceptRequestParameters, "items"> = {
            requestId: CoreId.from("CNSREQ1")
        }

        this.context.actionToTry = async () => {
            await this.context.incomingRequestsController.accept(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }

    public async iTryToCreateAnOutgoingRequest(): Promise<void> {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    await TestRequestItem.from({
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

    public iTryToRejectARequestWithSyntacticallyInvalidInput(): Promise<void> {
        const paramsWithoutItems: Omit<IRejectRequestParameters, "items"> = {
            requestId: CoreId.from("CNSREQ1")
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

    public theRequestHasItsResponsePropertySetCorrectly(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.response).to.exist
        expect(this.context.consumptionRequestAfterAction!.response).to.be.instanceOf(ConsumptionResponse)
        expect(this.context.consumptionRequestAfterAction!.response!.content).to.be.instanceOf(Response)
        expect(this.context.consumptionRequestAfterAction!.response!.content.requestId.toString()).to.equal(
            this.context.givenConsumptionRequest!.id.toString()
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
        const requestInDatabase = await ConsumptionRequest.from(requestDoc)

        expect(requestInDatabase).to.exist
        expect(requestInDatabase.toJSON()).to.deep.equal(this.context.consumptionRequestAfterAction!.toJSON())
    }

    public async theChangesArePersistedInTheDatabase(): Promise<void> {
        const requestDoc = await this.context.requestsCollection.read(
            this.context.consumptionRequestAfterAction!.id.toString()
        )
        const requestInDatabase = await ConsumptionRequest.from(requestDoc)

        expect(requestInDatabase.toJSON()).to.deep.equal(this.context.consumptionRequestAfterAction!.toJSON())
    }

    public theRequestHasTheId(id: CoreId): Promise<void> {
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
        case ConsumptionRequestStatus.WaitingForDecision:
            return 2
        case ConsumptionRequestStatus.ManualDecisionRequired:
            return 3
        case ConsumptionRequestStatus.Decided:
            return 5
        case ConsumptionRequestStatus.Completed:
            return 6
    }
}
