/* eslint-disable jest/expect-expect */
import { ConsumptionController, ConsumptionRequest, ConsumptionRequestStatus } from "@nmshd/consumption"
import {
    AcceptResponseItem,
    RelationshipCreationChangeRequestBody,
    RelationshipTemplateBody,
    Request,
    Response
} from "@nmshd/content"
import { AccountController, CoreDate, Message, Relationship, RelationshipTemplate, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { TestUtil } from "../../core/TestUtil"
import { RequestsIntegrationTest } from "./RequestsIntegrationTest"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class RequestEnd2EndTests extends RequestsIntegrationTest {
    public run(): void {
        const that = this
        const transport = new Transport(that.connection, that.config, that.loggerFactory)

        before(async function () {
            await transport.init()
        })

        describe("End2End Request/Response via Relationship Template/ChangeRequest", function () {
            let sAccountController: AccountController
            let sConsumptionController: ConsumptionController
            let rAccountController: AccountController
            let rConsumptionController: ConsumptionController

            let sTemplate: RelationshipTemplate
            let rTemplate: RelationshipTemplate
            let rConsumptionRequest: ConsumptionRequest
            let rRelationship: Relationship
            let sRelationship: Relationship
            let sConsumptionRequest: ConsumptionRequest

            before(async function () {
                this.timeout(30000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sAccountController, consumptionController: sConsumptionController } =
                    accounts[0])
                sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItemProcessor,
                    TestRequestItem
                )
                ;({ accountController: rAccountController, consumptionController: rConsumptionController } =
                    accounts[1])
                rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItemProcessor,
                    TestRequestItem
                )
            })

            it("sender: create a Relationship Template with the Request", async function () {
                const request = Request.from({
                    items: [TestRequestItem.from({ mustBeAccepted: false })]
                })
                sTemplate = await sAccountController.relationshipTemplates.sendRelationshipTemplate({
                    content: RelationshipTemplateBody.from({ newRelationshipRequest: request }),
                    expiresAt: CoreDate.utc().add({ hours: 1 }),
                    maxNumberOfRelationships: 1
                })
            })

            it("recipient: load Relationship Template", async function () {
                rTemplate = await rAccountController.relationshipTemplates.loadPeerRelationshipTemplate(
                    sTemplate.id,
                    sTemplate.secretKey
                )
            })

            it("recipient: create Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.received({
                    receivedRequest: (rTemplate.cache!.content as RelationshipTemplateBody).newRelationshipRequest,
                    requestSourceObject: rTemplate
                })
            })

            it("recipient: check prerequisites of Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
                    requestId: rConsumptionRequest.id
                })
            })

            it("recipient: require manual decision of Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.requireManualDecision({
                    requestId: rConsumptionRequest.id
                })
            })

            it("recipient: accept Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.accept({
                    requestId: rConsumptionRequest.id.toString(),
                    items: [
                        {
                            accept: true
                        }
                    ]
                })
            })

            it("recipient: create Relationship with Response in Relationship Change", async function () {
                rRelationship = await rAccountController.relationships.sendRelationship({
                    template: rTemplate,
                    content: RelationshipCreationChangeRequestBody.from({
                        response: rConsumptionRequest.response!.content
                    })
                })
            })

            it("recipient: complete Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.complete({
                    requestId: rConsumptionRequest.id,
                    responseSourceObject: rRelationship.cache!.changes[0]
                })
            })

            it("sender: syncEverything to get Relationship Change with Response", async function () {
                const newRelationships = await TestUtil.syncUntilHasRelationships(sAccountController)
                sRelationship = newRelationships[0]
            }).timeout(20000)

            it("sender: create Consumption Request and Response from Relationship Change", async function () {
                sConsumptionRequest =
                    await sConsumptionController.outgoingRequests.createFromRelationshipCreationChange({
                        template: sTemplate,
                        creationChange: sRelationship.cache!.changes[0]
                    })
            })

            it("expectations", function () {
                // in the end, both Consumption Requests should be completed
                expect(rConsumptionRequest.status).to.equal(ConsumptionRequestStatus.Completed)
                expect(sConsumptionRequest.status).to.equal(ConsumptionRequestStatus.Completed)

                // the ids of the Consumption Requests should be equal
                expect(rConsumptionRequest.id.toString()).to.equal(sConsumptionRequest.id.toString())

                // make sure (de-)serialization worked as expected
                expect(sTemplate.cache!.content).to.be.instanceOf(RelationshipTemplateBody)
                expect((sTemplate.cache!.content as RelationshipTemplateBody).newRelationshipRequest).to.be.instanceOf(
                    Request
                )

                expect(rTemplate.cache!.content).to.be.instanceOf(RelationshipTemplateBody)
                expect((rTemplate.cache!.content as RelationshipTemplateBody).newRelationshipRequest).to.be.instanceOf(
                    Request
                )

                expect(sConsumptionRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(rConsumptionRequest.content.items[0]).to.be.instanceOf(TestRequestItem)

                expect(
                    (sRelationship.cache!.changes[0].request.content as RelationshipCreationChangeRequestBody).response
                ).to.be.instanceOf(Response)
                expect(
                    (rRelationship.cache!.changes[0].request.content as RelationshipCreationChangeRequestBody).response
                ).to.be.instanceOf(Response)

                expect(sConsumptionRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
                expect(rConsumptionRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
            })
        })

        describe("End2End Request/Response via Messages", function () {
            let sAccountController: AccountController
            let sConsumptionController: ConsumptionController
            let rAccountController: AccountController
            let rConsumptionController: ConsumptionController

            let sConsumptionRequest: ConsumptionRequest
            let sMessageWithRequest: Message
            let rMessageWithRequest: Message
            let rConsumptionRequest: ConsumptionRequest
            let rMessageWithResponse: Message
            let sMessageWithResponse: Message

            this.timeout(3000)

            before(async function () {
                this.timeout(30000)
                await transport.init()

                await TestUtil.clearAccounts(that.connection)
                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sAccountController, consumptionController: sConsumptionController } =
                    accounts[0])
                sConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItemProcessor,
                    TestRequestItem
                )
                ;({ accountController: rAccountController, consumptionController: rConsumptionController } =
                    accounts[1])
                rConsumptionController.incomingRequests["processorRegistry"].registerProcessor(
                    TestRequestItemProcessor,
                    TestRequestItem
                )

                await TestUtil.addRelationship(sAccountController, rAccountController)
            })

            it("sender: create Consumption Request", async function () {
                sConsumptionRequest = await sConsumptionController.outgoingRequests.create({
                    content: Request.from({
                        items: [TestRequestItem.from({ mustBeAccepted: false })]
                    }),
                    peer: rAccountController.identity.address
                })
            })

            it("sender: send Message with Request", async function () {
                sMessageWithRequest = await sAccountController.messages.sendMessage({
                    content: sConsumptionRequest.content,
                    recipients: [rAccountController.identity.address]
                })
            })

            it("sender: mark Consumption Request as sent", async function () {
                sConsumptionRequest = await sConsumptionController.outgoingRequests.sent({
                    requestId: sConsumptionRequest.id,
                    requestSourceObject: sMessageWithRequest
                })
            })

            it("recipient: syncEverything to get Message with Request", async function () {
                const messages = await TestUtil.syncUntilHasMessages(rAccountController)
                rMessageWithRequest = messages[0]
            }).timeout(20000)

            it("recipient: create Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.received({
                    receivedRequest: rMessageWithRequest.cache!.content as Request,
                    requestSourceObject: rMessageWithRequest
                })
            })

            it("recipient: check prerequisites of Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.checkPrerequisites({
                    requestId: rConsumptionRequest.id
                })
            })

            it("recipient: require manual decision of Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.requireManualDecision({
                    requestId: rConsumptionRequest.id
                })
            })

            it("recipient: accept Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.accept({
                    requestId: rConsumptionRequest.id.toString(),
                    items: [
                        {
                            accept: true
                        }
                    ]
                })
            })

            it("recipient: send Message with Response", async function () {
                rMessageWithResponse = await rAccountController.messages.sendMessage({
                    content: rConsumptionRequest.response!.content,
                    recipients: [sAccountController.identity.address]
                })
            })

            it("recipient: complete Consumption Request", async function () {
                rConsumptionRequest = await rConsumptionController.incomingRequests.complete({
                    requestId: rConsumptionRequest.id,
                    responseSourceObject: rMessageWithResponse
                })
            })

            it("sender: syncEverything to get Message with Response", async function () {
                const messages = await TestUtil.syncUntilHasMessages(sAccountController)
                sMessageWithResponse = messages[0]
            }).timeout(20000)

            it("sender: complete Consumption Request", async function () {
                sConsumptionRequest = await sConsumptionController.outgoingRequests.complete({
                    requestId: sConsumptionRequest.id,
                    responseSourceObject: sMessageWithResponse,
                    receivedResponse: sMessageWithResponse.cache!.content as Response
                })
            })

            it("expectations", function () {
                // in the end, both Consumption Requests should be completed
                expect(rConsumptionRequest.status).to.equal(ConsumptionRequestStatus.Completed)
                expect(sConsumptionRequest.status).to.equal(ConsumptionRequestStatus.Completed)

                // the ids of the Consumption Requests should be equal
                expect(rConsumptionRequest.id.toString()).to.equal(sConsumptionRequest.id.toString())

                // make sure (de-)serialization worked as expected
                expect(sMessageWithRequest.cache!.content).to.be.instanceOf(Request)
                expect(rMessageWithRequest.cache!.content).to.be.instanceOf(Request)
                expect(sConsumptionRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(rConsumptionRequest.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(sMessageWithResponse.cache!.content).to.be.instanceOf(Response)
                expect(rMessageWithResponse.cache!.content).to.be.instanceOf(Response)
                expect(sConsumptionRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
                expect(rConsumptionRequest.response!.content.items[0]).to.be.instanceOf(AcceptResponseItem)
            })
        })
    }
}
