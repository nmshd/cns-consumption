import { IDatabaseCollection, IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import {
    AcceptRequestItemParameters,
    ConsumptionController,
    ConsumptionIds,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    ConsumptionResponse,
    IAcceptRequestParameters,
    ICreateOutgoingRequestParameters,
    IRejectRequestParameters,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { AcceptResponseItem, IResponse, Request, Response, ResponseItemResult, ResponseResult } from "@nmshd/content"
import {
    AccountController,
    CoreAddress,
    CoreId,
    IConfigOverwrite,
    Message,
    RelationshipTemplate
} from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

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
    public constructor(
        public readonly accountController: AccountController,
        public readonly consumptionController: ConsumptionController
    ) {
        this.requestsCollection = (consumptionController.outgoingRequests as any)
            .consumptionRequests as IDatabaseCollection
    }

    public givenConsumptionRequest?: ConsumptionRequest
    public consumptionRequestAfterAction?: ConsumptionRequest
    public actionToTry: () => Promise<void>
}

export class RequestsGiven {
    public constructor(private readonly context: RequestsTestsContext) {}

    public async anIncomingRequest(): Promise<ConsumptionRequest> {
        const requestSource = await TestObjectFactory.createIncomingMessage(
            this.context.accountController.identity.address
        )
        const request = await TestObjectFactory.createRequestWithOneItem()

        const consumptionRequest = await this.context.consumptionController.incomingRequests.received({
            content: request,
            source: requestSource
        })

        this.context.givenConsumptionRequest = consumptionRequest

        return consumptionRequest
    }

    public async anIncomingRequestWithAnItemAndAGroupInStatus(status: ConsumptionRequestStatus): Promise<void> {
        const content = await Request.from({
            "@type": "Request",
            items: [
                {
                    "@type": "TestRequestItem",
                    mustBeAccepted: false,
                    responseMetadata: {
                        outerItemMetaKey: "outerItemMetaValue"
                    }
                },
                {
                    "@type": "RequestItemGroup",
                    responseMetadata: {
                        groupMetaKey: "groupMetaValue"
                    },
                    mustBeAccepted: false,
                    items: [
                        {
                            "@type": "TestRequestItem",
                            responseMetadata: {
                                innerItemMetaKey: "innerItemMetaValue"
                            },
                            mustBeAccepted: false
                        }
                    ]
                }
            ]
        })

        await this.anIncomingRequestWith({ content, status })
    }

    public async anIncomingRequestWith(params: {
        id?: CoreId
        content?: Request
        status?: ConsumptionRequestStatus
    }): Promise<void> {
        params.id ??= await ConsumptionIds.request.generate()
        params.content ??= await TestObjectFactory.createRequestWithOneItem({ id: params.id })
        params.status ??= ConsumptionRequestStatus.Open

        const requestSource = await TestObjectFactory.createIncomingMessage(
            this.context.accountController.identity.address
        )

        const consumptionRequest = await this.context.consumptionController.incomingRequests.received({
            content: params.content,
            source: requestSource
        })

        await this.moveRequestToStatus(consumptionRequest, params.status)

        this.context.givenConsumptionRequest = consumptionRequest
    }

    public async anIncomingRequestInStatus(status: ConsumptionRequestStatus): Promise<void> {
        await this.anIncomingRequestWith({ status: status })
    }

    private async moveRequestToStatus(consumptionRequest: ConsumptionRequest, status: ConsumptionRequestStatus) {
        if (status === ConsumptionRequestStatus.Open) return

        if (status === ConsumptionRequestStatus.Decided) {
            await this.context.consumptionController.incomingRequests.accept({
                requestId: consumptionRequest.id,
                items: [AcceptRequestItemParameters.from({})]
            })
        }

        if (status === ConsumptionRequestStatus.Completed) {
            await this.context.consumptionController.incomingRequests.complete(consumptionRequest.id)
        }
    }

    public async anOutgoingRequest(): Promise<ConsumptionRequest> {
        return await this.anOutgoingRequestWith({})
    }

    public async anOutgoingRequestInStatus(status: ConsumptionRequestStatus): Promise<void> {
        await this.anOutgoingRequestWith({ status: status })
    }

    public async anOutgoingRequestWith(params: { status?: ConsumptionRequestStatus }): Promise<ConsumptionRequest> {
        params.status ??= ConsumptionRequestStatus.Open

        this.context.givenConsumptionRequest =
            await this.context.consumptionController.outgoingRequests.createOutgoingRequest({
                content: {
                    items: [
                        {
                            mustBeAccepted: false
                        }
                    ]
                },
                peer: CoreAddress.from("id1")
            })

        return this.context.givenConsumptionRequest
    }
}

export class RequestsWhen {
    public constructor(private readonly context: RequestsTestsContext) {}

    public async iCreateAnOutgoingRequest(): Promise<void> {
        const params: ICreateOutgoingRequestParameters = {
            content: {
                items: [
                    {
                        mustBeAccepted: false
                    }
                ]
            },
            peer: CoreAddress.from("id1")
        }

        this.context.consumptionRequestAfterAction =
            await this.context.consumptionController.outgoingRequests.createOutgoingRequest(params)
    }

    public async iCreateAnIncomingRequestWithSource(source: Message | RelationshipTemplate): Promise<void> {
        const request = await TestObjectFactory.createRequestWithOneItem()

        this.context.consumptionRequestAfterAction = await this.context.consumptionController.incomingRequests.received(
            {
                content: request,
                source: source
            }
        )
    }

    public async iCreateAnIncomingRequestWith(params: {
        content?: Request
        source?: Message | RelationshipTemplate
    }): Promise<void> {
        params.content ??= await TestObjectFactory.createRequestWithOneItem()
        params.source ??= await TestObjectFactory.createIncomingMessage(this.context.accountController.identity.address)

        this.context.consumptionRequestAfterAction = await this.context.consumptionController.incomingRequests.received(
            {
                content: params.content,
                source: params.source
            }
        )
    }

    public iTryToCreateAnIncomingRequestWith(params: { source: Message | RelationshipTemplate }): Promise<void> {
        this.context.actionToTry = async () => await this.iCreateAnIncomingRequestWithSource(params.source)
        return Promise.resolve()
    }

    public async iCompleteTheRequest(): Promise<void> {
        this.context.consumptionRequestAfterAction = await this.context.consumptionController.incomingRequests.complete(
            this.context.givenConsumptionRequest!.id
        )
    }

    public async iAcceptTheRequest(params?: Omit<IAcceptRequestParameters, "requestId">): Promise<void> {
        params ??= {
            items: [AcceptRequestItemParameters.from({})]
        }

        this.context.consumptionRequestAfterAction = await this.context.consumptionController.incomingRequests.accept({
            requestId: this.context.givenConsumptionRequest!.id,
            ...params
        })
    }

    public async iRejectTheRequest(params?: Omit<IAcceptRequestParameters, "requestId">): Promise<void> {
        params ??= {
            items: [RejectRequestItemParameters.from({})]
        }

        this.context.consumptionRequestAfterAction = await this.context.consumptionController.incomingRequests.reject({
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

        this.context.consumptionRequestAfterAction = await this.context.consumptionController.outgoingRequests.complete(
            this.context.givenConsumptionRequest!.id,
            responseSource,
            responseContent
        )
    }

    public async iGetTheIncomingRequestWith(id: CoreId): Promise<void> {
        this.context.consumptionRequestAfterAction = await this.context.consumptionController.incomingRequests.get(id)
    }

    public async iGetTheOutgoingRequestWith(id: CoreId): Promise<void> {
        this.context.consumptionRequestAfterAction = await this.context.consumptionController.outgoingRequests.get(id)
    }

    public async iTryToGetARequestWithANonExistentId(): Promise<void> {
        this.context.consumptionRequestAfterAction = (await this.context.consumptionController.incomingRequests.get(
            await CoreId.generate()
        ))!
    }

    public iTryToCompleteTheRequest(): Promise<void> {
        this.context.actionToTry = async () => {
            await this.context.consumptionController.incomingRequests.complete(this.context.givenConsumptionRequest!.id)
        }

        return Promise.resolve()
    }

    public iTryToAcceptARequestWithSyntacticallyInvalidInput(): Promise<void> {
        const paramsWithoutItems: Omit<IAcceptRequestParameters, "items"> = {
            requestId: CoreId.from("CNSREQ1")
        }

        this.context.actionToTry = async () => {
            await this.context.consumptionController.incomingRequests.accept(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }

    public iTryToRejectARequestWithSyntacticallyInvalidInput(): Promise<void> {
        const paramsWithoutItems: Omit<IRejectRequestParameters, "items"> = {
            requestId: CoreId.from("CNSREQ1")
        }

        this.context.actionToTry = async () => {
            await this.context.consumptionController.incomingRequests.reject(paramsWithoutItems as any)
        }

        return Promise.resolve()
    }
}

export class RequestsThen {
    public constructor(private readonly context: RequestsTestsContext) {}

    // eslint-disable-next-line @typescript-eslint/naming-convention
    public get And(): this {
        return this
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
        expect(this.context.consumptionRequestAfterAction!.peer!.toString()).to.equal(createdBy.toString())
        expect(this.context.consumptionRequestAfterAction!.source).to.exist
        expect(this.context.consumptionRequestAfterAction!.source!.reference.toString()).to.equal(sourceId.toString())
        expect(this.context.consumptionRequestAfterAction!.source!.type).to.equal(sourceType)
        expect(this.context.consumptionRequestAfterAction!.response).to.be.undefined
        expect(this.context.consumptionRequestAfterAction!.status).to.equal(ConsumptionRequestStatus.Open)
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

    public theRequestHasItsResponsePropertySet(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.response).to.exist
        expect(this.context.consumptionRequestAfterAction!.response).to.be.instanceOf(ConsumptionResponse)
        expect(this.context.consumptionRequestAfterAction!.response!.content).to.be.instanceOf(Response)
        expect(this.context.consumptionRequestAfterAction!.response!.content.requestId.toString()).to.equal(
            this.context.givenConsumptionRequest!.id.toString()
        )

        return Promise.resolve()
    }

    public theRequestIsInStatus(status: ConsumptionRequestStatus): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.status).to.equal(status)
        return Promise.resolve()
    }

    public theRequestDoesNotHaveSourceAndPeerSet(): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.peer).to.be.undefined
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

    public theCreatedRequestHasTheId(id: CoreId): Promise<void> {
        expect(this.context.consumptionRequestAfterAction!.id.toString()).to.equal(id.toString())
        return Promise.resolve()
    }

    public iExpectTheResponseContent(customExpects: (responseContent: Response) => void): Promise<void> {
        customExpects(this.context.consumptionRequestAfterAction!.response!.content)
        return Promise.resolve()
    }

    public async itFailsWithTheErrorMessage(errorMessage: string): Promise<void> {
        await TestUtil.expectThrowsAsync(this.context.actionToTry, errorMessage)
    }
}
