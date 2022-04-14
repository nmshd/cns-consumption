import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import {
    AcceptRequestItemParameters,
    GenericRequestItemProcessor,
    RejectRequestItemParameters,
    ValidationResult
} from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem } from "@nmshd/content"
import { IConfigOverwrite } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class GenericRequestItemProcessorTests extends IntegrationTest {
    public constructor(
        protected override config: IConfigOverwrite,
        protected override connection: IDatabaseConnection,
        protected override loggerFactory: ILoggerFactory
    ) {
        super(config, connection, loggerFactory)
    }

    public run(): void {
        // const that = this
        // const transport = new Transport(that.connection, that.config, that.loggerFactory)
        // let defaultAccount: Account

        // before(async function () {
        // await TestUtil.clearAccounts(that.connection)
        // await transport.init()
        // const accountController = (await TestUtil.provideAccounts(transport, 1))[0]
        // const consumptionController = await new ConsumptionController(transport, accountController).init()
        // defaultAccount = {
        //     accountController,
        //     consumptionController
        // }
        // })

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
                it("returns an AcceptResponseItem", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new AcceptRequestItemParameters()
                    const result = await processor.accept(requestItem, params)

                    expect(result).to.be.instanceOf(AcceptResponseItem)
                })

                it("throws when canAccept returns a validation error", async function () {
                    const processor = new FailingTestItemProcessor()

                    await TestUtil.expectThrowsAsync(
                        processor.accept(new TestRequestItem(), await AcceptRequestItemParameters.from({})),
                        "*aCode*aMessage*"
                    )
                })
            })

            describe("Reject", function () {
                it("returns a RejectResponseItem", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new AcceptRequestItemParameters()
                    const result = await processor.reject(requestItem, params)

                    expect(result).to.be.instanceOf(RejectResponseItem)
                })

                it("throws when canReject returns a validation error", async function () {
                    const processor = new FailingTestItemProcessor()

                    await TestUtil.expectThrowsAsync(
                        processor.reject(new TestRequestItem(), await RejectRequestItemParameters.from({})),
                        "*aCode*aMessage*"
                    )
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

class FailingTestItemProcessor extends TestRequestItemProcessor {
    public override canAccept(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
    }

    public override canReject(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
    }
}
