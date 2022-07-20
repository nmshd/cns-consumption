import { ConsumptionController, GenericRequestItemProcessor } from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem, ResponseItemResult } from "@nmshd/content"
import { AccountController, CoreAddress, IdentityController } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestRequestItem } from "./testHelpers/TestRequestItem"

export class GenericRequestItemProcessorTests extends IntegrationTest {
    public run(): void {
        describe("RequestItemProcessor", function () {
            /* ****** Incoming RequestItems ******* */
            describe("CheckPrerequisitesOfIncomingRequestItem", function () {
                it("returns true", async function () {
                    const processor = createProcessor()
                    const requestItem = new TestRequestItem()

                    const actual = await processor.checkPrerequisitesOfIncomingRequestItem(requestItem, undefined!)

                    expect(actual).to.be.true
                })
            })

            describe("CanAccept", function () {
                it("returns 'success'", async function () {
                    const processor = createProcessor()

                    const localRequest = undefined! // pass undefined as request since it isn't used anyway

                    const result = await processor.canAccept(
                        TestRequestItem.from({ mustBeAccepted: false }),
                        {
                            accept: true
                        },
                        localRequest
                    )

                    expect(result).to.be.a.successfulValidationResult()
                })
            })

            describe("CanReject", function () {
                it("returns 'success'", async function () {
                    const processor = createProcessor()

                    const localRequest = undefined! // pass undefined as request since it isn't used anyway

                    const result = await processor.canReject(
                        TestRequestItem.from({ mustBeAccepted: false }),
                        {
                            accept: false
                        },
                        localRequest
                    )

                    expect(result).to.be.a.successfulValidationResult()
                })
            })

            describe("Accept", function () {
                it("returns an AcceptResponseItem", function () {
                    const processor = createProcessor()

                    const localRequest = undefined! // pass undefined as request since it isn't used anyway

                    const result = processor.accept(
                        TestRequestItem.from({ mustBeAccepted: false }),
                        {
                            accept: true
                        },
                        localRequest
                    )

                    expect(result).to.be.instanceOf(AcceptResponseItem)
                })
            })

            describe("Reject", function () {
                it("returns a RejectResponseItem", function () {
                    const processor = createProcessor()

                    const localRequest = undefined! // pass undefined as request since it isn't used anyway

                    const result = processor.reject(
                        TestRequestItem.from({ mustBeAccepted: false }),
                        {
                            accept: false
                        },
                        localRequest
                    )

                    expect(result).to.be.instanceOf(RejectResponseItem)
                })
            })

            /* ****** Outgoing RequestItems ******* */
            describe("CanCreateOutgoingRequestItem", function () {
                it("returns true", async function () {
                    const processor = createProcessor()

                    const actual = await processor.canCreateOutgoingRequestItem(
                        TestRequestItem.from({ mustBeAccepted: false }),
                        undefined!,
                        undefined!
                    )

                    expect(actual.isSuccess()).to.be.true
                })
            })

            describe("CanApplyIncomingResponseItem", function () {
                it("returns 'success'", async function () {
                    const processor = createProcessor()

                    const localRequest = undefined! // pass undefined as request since it isn't used anyway

                    const actual = await processor.canApplyIncomingResponseItem(
                        AcceptResponseItem.from({ result: ResponseItemResult.Accepted }),
                        TestRequestItem.from({ mustBeAccepted: false }),
                        localRequest
                    )

                    expect(actual.isSuccess()).to.be.true
                })
            })
        })
    }
}

function createProcessor() {
    const fakeConsumptionController = {
        accountController: {
            identity: { address: CoreAddress.from("anAddress") } as IdentityController
        } as AccountController
    } as ConsumptionController

    return new GenericRequestItemProcessor(fakeConsumptionController)
}
