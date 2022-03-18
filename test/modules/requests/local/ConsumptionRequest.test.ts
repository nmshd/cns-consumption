import {
    ConsumptionRequest,
    ConsumptionRequestJSON,
    ConsumptionRequestStatus,
    ConsumptionRequestStatusLogEntry,
    ConsumptionResponse
} from "@nmshd/consumption"
import { ResponseItem } from "@nmshd/content"
import { expect } from "chai"
import { UnitTest } from "../../../core/UnitTest"
import { TestObjectFactory, TestRequestItem } from "../TestObjectFactory"

export class ConsumptionRequestTest extends UnitTest {
    public run(): void {
        describe("ConsumptionRequest", function () {
            it("creates objects of all classes", async function () {
                const requestJSON: ConsumptionRequestJSON = {
                    "@type": "ConsumptionRequest",
                    id: "CNSREQ1",
                    isOwn: true,
                    peer: "id11",
                    createdAt: "2020-01-01T00:00:00.000Z",
                    content: TestObjectFactory.createRequest(),
                    sourceType: "Message",
                    sourceReference: "MSG1",
                    response: {
                        "@type": "ConsumptionResponse",
                        createdAt: "2020-01-01T00:00:00.000Z",
                        content: TestObjectFactory.createResponse(),
                        sourceReference: "MSG2",
                        sourceType: "Message"
                    },
                    status: ConsumptionRequestStatus.Checked,
                    statusLog: [
                        {
                            "@type": "ConsumptionRequestStatusLogEntry",
                            createdAt: "2020-01-01T00:00:00.000Z",
                            oldStatus: ConsumptionRequestStatus.Checked,
                            newStatus: ConsumptionRequestStatus.DecisionRequired
                        }
                    ]
                }

                const request = await ConsumptionRequest.from(requestJSON)

                expect(request).to.be.instanceOf(ConsumptionRequest)
                expect(request.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(request.response).to.be.instanceOf(ConsumptionResponse)
                expect(request.response!.content.items[0]).to.be.instanceOf(ResponseItem)
                expect(request.statusLog[0]).to.be.instanceOf(ConsumptionRequestStatusLogEntry)
            })

            it("keeps all properties during serialization and deserialization", async function () {
                const requestJSON: ConsumptionRequestJSON = {
                    "@type": "ConsumptionRequest",
                    id: "CNSREQ1",
                    isOwn: true,
                    peer: "id11",
                    createdAt: "2020-01-01T00:00:00.000Z",
                    status: ConsumptionRequestStatus.Checked,
                    sourceType: "Message",
                    sourceReference: "MSG1",
                    content: TestObjectFactory.createRequest(),
                    response: {
                        "@type": "ConsumptionResponse",
                        createdAt: "2020-01-01T00:00:00.000Z",
                        sourceReference: "MSG2",
                        sourceType: "Message",
                        content: TestObjectFactory.createResponse()
                    },
                    statusLog: [
                        {
                            "@type": "ConsumptionRequestStatusLogEntry",
                            createdAt: "2020-01-01T00:00:00.000Z",
                            oldStatus: ConsumptionRequestStatus.Checked,
                            newStatus: ConsumptionRequestStatus.DecisionRequired,
                            data: {},
                            code: "irrelevant-for-this-test"
                        }
                    ]
                }

                const request = await ConsumptionRequest.from(requestJSON)

                const serializedRequest = request.toJSON(true)

                expect(serializedRequest).excludingEvery("@type").to.deep.equal(requestJSON)
                expect((serializedRequest as any)["@type"]).to.equal("ConsumptionRequest")
            })
        })
    }
}
