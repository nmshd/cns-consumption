import { GenericRequestItemProcessor, RequestItemDecision } from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem, ResponseItemResult } from "@nmshd/content"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestRequestItem } from "./testHelpers/TestRequestItem"

export class GenericRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        describe("RequestItemProcessor", function () {
            /* ****** Incoming RequestItems ******* */
            describe("CheckPrerequisitesOfIncomingRequestItem", function () {
                it("returns true", async function () {
                    const processor = new GenericRequestItemProcessor()
                    const requestItem = new TestRequestItem()

                    const actual = await processor.checkPrerequisitesOfIncomingRequestItem(requestItem)

                    expect(actual).to.be.true
                })
            })

            describe("CanAccept", function () {
                it("returns 'success'", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const result = await processor.canAccept(TestRequestItem.from({ mustBeAccepted: false }), {
                        decision: RequestItemDecision.Accept
                    })

                    expect(result.isSuccess()).to.be.true
                })
            })

            describe("CanReject", function () {
                it("returns 'success'", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const result = await processor.canReject(TestRequestItem.from({ mustBeAccepted: false }), {
                        decision: RequestItemDecision.Reject
                    })

                    expect(result.isSuccess()).to.be.true
                })
            })

            describe("Accept", function () {
                it("returns an AcceptResponseItem", function () {
                    const processor = new GenericRequestItemProcessor()

                    const result = processor.accept(TestRequestItem.from({ mustBeAccepted: false }), {
                        decision: RequestItemDecision.Accept
                    })

                    expect(result).to.be.instanceOf(AcceptResponseItem)
                })
            })

            describe("Reject", function () {
                it("returns a RejectResponseItem", function () {
                    const processor = new GenericRequestItemProcessor()

                    const result = processor.reject(TestRequestItem.from({ mustBeAccepted: false }), {
                        decision: RequestItemDecision.Reject
                    })

                    expect(result).to.be.instanceOf(RejectResponseItem)
                })
            })

            /* ****** Outgoing RequestItems ******* */
            describe("CanCreateOutgoingRequestItem", function () {
                it("returns true", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const actual = await processor.canCreateOutgoingRequestItem(
                        TestRequestItem.from({ mustBeAccepted: false })
                    )

                    expect(actual.isSuccess()).to.be.true
                })
            })

            describe("CanApplyIncomingResponseItem", function () {
                it("returns 'success'", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const actual = await processor.canApplyIncomingResponseItem(
                        AcceptResponseItem.from({ result: ResponseItemResult.Accepted }),
                        TestRequestItem.from({ mustBeAccepted: false })
                    )

                    expect(actual.isSuccess()).to.be.true
                })
            })
        })
    }
}
