/* eslint-disable jest/expect-expect */
import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { Request, Response } from "@nmshd/content"
import {
    AccountController,
    CoreDate,
    IConfigOverwrite,
    Message,
    Relationship,
    RelationshipTemplate,
    Transport
} from "@nmshd/transport"
import { expect } from "chai"
import { AcceptRequestItemParameters, ConsumptionController, ConsumptionRequest } from "../../../src"
import { TestUtil } from "../../core/TestUtil"
import { RequestsIntegrationTest } from "./RequestsIntegrationTest"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class RequestEnd2EndTests extends RequestsIntegrationTest {
    public constructor(config: IConfigOverwrite, connection: IDatabaseConnection, loggerFactory: ILoggerFactory) {
        super(config, connection, loggerFactory)
    }

    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.loggerFactory)

        before(async function () {
            await transport.init()
        })

        describe("End2End Request/Response via Relationship Template/ChangeRequest", function () {
            let accountControllerSender: AccountController
            let consumptionControllerSender: ConsumptionController
            let accountControllerRecipient: AccountController
            let consumptionControllerRecipient: ConsumptionController

            let templateSender: RelationshipTemplate
            let templateRecipient: RelationshipTemplate
            let consumptionRequestRecipient: ConsumptionRequest
            let relationshipRecipient: Relationship
            let relationshipSender: Relationship
            let consumptionRequestSender: ConsumptionRequest

            before(async function () {
                this.timeout(5000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: accountControllerSender, consumptionController: consumptionControllerSender } =
                    accounts[0])
                consumptionControllerSender.incomingRequests.processorRegistry.registerProcessorForType(
                    TestRequestItemProcessor,
                    TestRequestItem
                )
                ;({
                    accountController: accountControllerRecipient,
                    consumptionController: consumptionControllerRecipient
                } = accounts[1])
                consumptionControllerRecipient.incomingRequests.processorRegistry.registerProcessorForType(
                    TestRequestItemProcessor,
                    TestRequestItem
                )
            })

            it("sender: create a Relationship Template with the Request", async function () {
                const request = await Request.from({
                    items: [await TestRequestItem.from({ mustBeAccepted: false })]
                })
                templateSender = await accountControllerSender.relationshipTemplates.sendRelationshipTemplate({
                    content: request,
                    expiresAt: CoreDate.utc().add({ hours: 1 }),
                    maxNumberOfRelationships: 1
                })
            })

            it("recipient: load Relationship Template", async function () {
                templateRecipient = await accountControllerRecipient.relationshipTemplates.loadPeerRelationshipTemplate(
                    templateSender.id,
                    templateSender.secretKey
                )

                expect(templateRecipient.cache!.content).to.be.instanceOf(Request)
            })

            it("recipient: create Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.received({
                    receivedRequest: templateRecipient.cache!.content as Request,
                    requestSourceObject: templateRecipient
                })
            })

            it("recipient: check prerequisites of Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.checkPrerequisites({
                    requestId: consumptionRequestRecipient.id
                })
            })

            it("recipient: require manual decision of Consumption Request", async function () {
                consumptionRequestRecipient =
                    await consumptionControllerRecipient.incomingRequests.requireManualDecision({
                        requestId: consumptionRequestRecipient.id
                    })
            })

            it("recipient: accept Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.accept({
                    requestId: consumptionRequestRecipient.id,
                    items: [await AcceptRequestItemParameters.from({})]
                })
            })

            it("recipient: create Relationship with Response in Relationship Change", async function () {
                relationshipRecipient = await accountControllerRecipient.relationships.sendRelationship({
                    template: templateRecipient,
                    content: consumptionRequestRecipient.response!.content
                })
            })

            it("recipient: complete Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.complete({
                    requestId: consumptionRequestRecipient.id,
                    responseSourceObject: relationshipRecipient.cache!.changes[0]
                })
            })

            it("sender: syncEverything to get Relationship Change with Response", async function () {
                const newRelationships = await TestUtil.syncUntilHasRelationships(accountControllerSender)
                relationshipSender = newRelationships[0]
            }).timeout(5000)

            it("sender: create Consumption Request and mark it as sent", async function () {
                consumptionRequestSender = await consumptionControllerSender.outgoingRequests.create({
                    peer: relationshipSender.peer.address,
                    content: templateSender.cache!.content as Request
                })
                consumptionRequestSender = await consumptionControllerSender.outgoingRequests.sent({
                    requestId: consumptionRequestSender.id,
                    requestSourceObject: templateSender
                })
            })

            it("sender: accept Relationship Change", async function () {
                relationshipSender = await accountControllerSender.relationships.acceptChange(
                    relationshipSender.cache!.changes[0],
                    {}
                )
            })

            it("sender: complete Consumption Request", async function () {
                const response = relationshipSender.cache!.changes[0].request.content! as Response

                consumptionRequestSender = await consumptionControllerSender.outgoingRequests.complete({
                    requestId: consumptionRequestSender.id,
                    responseSourceObject: relationshipSender.cache!.changes[0],
                    receivedResponse: response
                })
            })
        })

        describe("End2End Request/Response via Messages", function () {
            let accountControllerSender: AccountController
            let consumptionControllerSender: ConsumptionController
            let accountControllerRecipient: AccountController
            let consumptionControllerRecipient: ConsumptionController

            let consumptionRequestSender: ConsumptionRequest
            let messageWithRequestOfSender: Message
            let messageWithRequestOfRecipient: Message
            let consumptionRequestRecipient: ConsumptionRequest
            let messageWithResponseOfRecipient: Message
            let messageWithResponseOfSender: Message

            before(async function () {
                this.timeout(5000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: accountControllerSender, consumptionController: consumptionControllerSender } =
                    accounts[0])
                consumptionControllerSender.incomingRequests.processorRegistry.registerProcessorForType(
                    TestRequestItemProcessor,
                    TestRequestItem
                )
                ;({
                    accountController: accountControllerRecipient,
                    consumptionController: consumptionControllerRecipient
                } = accounts[1])
                consumptionControllerRecipient.incomingRequests.processorRegistry.registerProcessorForType(
                    TestRequestItemProcessor,
                    TestRequestItem
                )

                await TestUtil.addRelationship(accountControllerSender, accountControllerRecipient)
            })

            it("sender: create Consumption Request", async function () {
                consumptionRequestSender = await consumptionControllerSender.outgoingRequests.create({
                    content: await Request.from({
                        items: [await TestRequestItem.from({ mustBeAccepted: false })]
                    }),
                    peer: accountControllerRecipient.identity.address
                })
            })

            it("sender: send Message with Request", async function () {
                messageWithRequestOfSender = await accountControllerSender.messages.sendMessage({
                    content: consumptionRequestSender.content,
                    recipients: [accountControllerRecipient.identity.address]
                })
            })

            it("sender: mark Consumption Request as sent", async function () {
                consumptionRequestSender = await consumptionControllerSender.outgoingRequests.sent({
                    requestId: consumptionRequestSender.id,
                    requestSourceObject: messageWithRequestOfSender
                })
            })

            it("recipient: syncEverything to get Message with Request", async function () {
                const messages = await TestUtil.syncUntilHasMessages(accountControllerRecipient)
                messageWithRequestOfRecipient = messages[0]
            }).timeout(5000)

            it("recipient: create Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.received({
                    receivedRequest: messageWithRequestOfRecipient.cache!.content as Request,
                    requestSourceObject: messageWithRequestOfRecipient
                })
            })

            it("recipient: check prerequisites of Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.checkPrerequisites({
                    requestId: consumptionRequestRecipient.id
                })
            })

            it("recipient: require manual decision of Consumption Request", async function () {
                consumptionRequestRecipient =
                    await consumptionControllerRecipient.incomingRequests.requireManualDecision({
                        requestId: consumptionRequestRecipient.id
                    })
            })

            it("recipient: accept Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.accept({
                    requestId: consumptionRequestRecipient.id,
                    items: [await AcceptRequestItemParameters.from({})]
                })
            })

            it("recipient: send Message with Response", async function () {
                messageWithResponseOfRecipient = await accountControllerRecipient.messages.sendMessage({
                    content: consumptionRequestRecipient.response!.content,
                    recipients: [accountControllerSender.identity.address]
                })
            })

            it("recipient: complete Consumption Request", async function () {
                consumptionRequestRecipient = await consumptionControllerRecipient.incomingRequests.complete({
                    requestId: consumptionRequestRecipient.id,
                    responseSourceObject: messageWithResponseOfRecipient
                })
            })

            it("sender: syncEverything to get Message with Response", async function () {
                const messages = await TestUtil.syncUntilHasMessages(accountControllerSender)
                messageWithResponseOfSender = messages[0]
            }).timeout(5000)

            it("sender: complete Consumption Request", async function () {
                consumptionRequestSender = await consumptionControllerSender.outgoingRequests.complete({
                    requestId: consumptionRequestSender.id,
                    responseSourceObject: messageWithResponseOfSender,
                    receivedResponse: messageWithResponseOfSender.cache!.content as Response
                })
            })
        })
    }
}
