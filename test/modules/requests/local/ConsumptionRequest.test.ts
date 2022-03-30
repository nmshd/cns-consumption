import {
    ConsumptionRequest,
    ConsumptionRequestStatus,
    ConsumptionRequestStatusLogEntry,
    ConsumptionResponse,
    IConsumptionRequest
} from "@nmshd/consumption"
import { ResponseItem } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import { UnitTest } from "../../../core/UnitTest"
import { TestObjectFactory } from "../testHelpers/TestObjectFactory"
import { TestRequestItem } from "../testHelpers/TestRequestItem"

export class ConsumptionRequestTest extends UnitTest {
    public run(): void {
        describe("ConsumptionRequest", function () {
            it("creates objects of all nested classes", async function () {
                const requestJSON: IConsumptionRequest = {
                    id: CoreId.from("CNSREQ1"),
                    isOwn: true,
                    peer: CoreAddress.from("id11"),
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    content: await TestObjectFactory.createRequestWithOneItem(),
                    source: { type: "Message", reference: CoreId.from("MSG1") },
                    response: {
                        createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                        content: await TestObjectFactory.createResponse(),
                        source: { reference: CoreId.from("MSG2"), type: "Message" }
                    },
                    status: ConsumptionRequestStatus.Checked,
                    statusLog: [
                        ConsumptionRequestStatusLogEntry.from({
                            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                            oldStatus: ConsumptionRequestStatus.Checked,
                            newStatus: ConsumptionRequestStatus.DecisionRequired
                        })
                    ]
                }

                const request = await ConsumptionRequest.from(requestJSON)

                expect(request).to.be.instanceOf(ConsumptionRequest)
                expect(request.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(request.response).to.be.instanceOf(ConsumptionResponse)
                expect(request.response!.content.items[0]).to.be.instanceOf(ResponseItem)
                expect(request.statusLog[0]).to.be.instanceOf(ConsumptionRequestStatusLogEntry)
            })
        })
    }
}
