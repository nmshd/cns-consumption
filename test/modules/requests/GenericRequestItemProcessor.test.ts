import {
    AcceptRequestItemParameters,
    GenericRequestItemProcessor,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem } from "@nmshd/content"
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

                    const requestItem = new TestRequestItem()
                    const params = new AcceptRequestItemParameters()
                    const result = await processor.canAccept(requestItem, params)

                    expect(result.isSuccess()).to.be.true
                })
            })

            describe("CanReject", function () {
                it("returns 'success'", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new RejectRequestItemParameters()
                    const result = await processor.canReject(requestItem, params)

                    expect(result.isSuccess()).to.be.true
                })
            })

            describe("Accept", function () {
                it("returns an AcceptResponseItem", function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new AcceptRequestItemParameters()
                    const result = processor.accept(requestItem, params)

                    expect(result).to.be.instanceOf(AcceptResponseItem)
                })
            })

            describe("Reject", function () {
                it("returns a RejectResponseItem", function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new AcceptRequestItemParameters()
                    const result = processor.reject(requestItem, params)

                    expect(result).to.be.instanceOf(RejectResponseItem)
                })
            })

            /* ****** Outgoing RequestItems ******* */
            describe("CanCreateOutgoingRequestItem", function () {
                it("returns true", async function () {
                    const processor = new GenericRequestItemProcessor()
                    const requestItem = new TestRequestItem()

                    const actual = await processor.canCreateOutgoingRequestItem(requestItem)

                    expect(actual.isSuccess()).to.be.true
                })
            })

            describe("CanApplyIncomingResponseItem", function () {
                it("returns 'success'", async function () {
                    const processor = new GenericRequestItemProcessor()
                    const requestItem = new TestRequestItem()
                    const responseItem = new AcceptResponseItem()

                    const actual = await processor.canApplyIncomingResponseItem(responseItem, requestItem)

                    expect(actual.isSuccess()).to.be.true
                })
            })
        })
    }
}
