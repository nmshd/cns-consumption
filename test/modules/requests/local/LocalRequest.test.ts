import {
    ILocalRequest,
    LocalRequest,
    LocalRequestStatus,
    LocalRequestStatusLogEntry,
    LocalResponse
} from "@nmshd/consumption"
import { ResponseItem } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import { UnitTest } from "../../../core/UnitTest"
import { TestObjectFactory } from "../testHelpers/TestObjectFactory"
import { TestRequestItem } from "../testHelpers/TestRequestItem"

export class LocalRequestTest extends UnitTest {
    public run(): void {
        describe("LocalRequest", function () {
            it("creates objects of all nested classes", function () {
                const requestJSON: ILocalRequest = {
                    id: CoreId.from("REQ1"),
                    isOwn: true,
                    peer: CoreAddress.from("id11"),
                    createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                    content: TestObjectFactory.createRequestWithOneItem(),
                    source: { type: "Message", reference: CoreId.from("MSG1") },
                    response: {
                        createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                        content: TestObjectFactory.createResponse(),
                        source: { reference: CoreId.from("MSG2"), type: "Message" }
                    },
                    status: LocalRequestStatus.Open,
                    statusLog: [
                        LocalRequestStatusLogEntry.from({
                            createdAt: CoreDate.from("2020-01-01T00:00:00.000Z"),
                            oldStatus: LocalRequestStatus.Open,
                            newStatus: LocalRequestStatus.Completed
                        })
                    ]
                }

                const request = LocalRequest.from(requestJSON)

                expect(request).to.be.instanceOf(LocalRequest)
                expect(request.content.items[0]).to.be.instanceOf(TestRequestItem)
                expect(request.response).to.be.instanceOf(LocalResponse)
                expect(request.response!.content.items[0]).to.be.instanceOf(ResponseItem)
                expect(request.statusLog[0]).to.be.instanceOf(LocalRequestStatusLogEntry)
            })
        })
    }
}