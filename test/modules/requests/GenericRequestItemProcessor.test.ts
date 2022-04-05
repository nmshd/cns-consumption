import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import {
    AcceptRequestItemParameters,
    DecideRequestItemValidationError,
    DecideRequestItemValidationResult,
    GenericRequestItemProcessor,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { IConfigOverwrite } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestRequestItem } from "./testHelpers/TestRequestItem"
import { TestRequestItemProcessor } from "./testHelpers/TestRequestItemProcessor"

export class RequestItemProcessorTests extends IntegrationTest {
    public constructor(
        protected config: IConfigOverwrite,
        protected connection: IDatabaseConnection,
        protected loggerFactory: ILoggerFactory
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
            describe("CanAccept", function () {
                it("defaults to true", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new AcceptRequestItemParameters()
                    const result = await processor.canAccept(requestItem, params)

                    expect(result.isSuccess).to.be.true
                })
            })

            describe("CanReject", function () {
                it("defaults to true", async function () {
                    const processor = new GenericRequestItemProcessor()

                    const requestItem = new TestRequestItem()
                    const params = new RejectRequestItemParameters()
                    const result = await processor.canReject(requestItem, params)

                    expect(result.isSuccess).to.be.true
                })
            })

            describe("Accept", function () {
                it("throws when canAccept returns a validation error", async function () {
                    const processor = new FailingTestItemProcessor()

                    await TestUtil.expectThrowsAsync(
                        processor.accept(new TestRequestItem(), AcceptRequestItemParameters.from({})),
                        "*aCode*aMessage*"
                    )
                })
            })

            describe("Reject", function () {
                it("throws when canReject returns a validation error", async function () {
                    const processor = new FailingTestItemProcessor()

                    await TestUtil.expectThrowsAsync(
                        processor.reject(new TestRequestItem(), RejectRequestItemParameters.from({})),
                        "*aCode*aMessage*"
                    )
                })
            })
        })
    }
}
class FailingTestItemProcessor extends TestRequestItemProcessor {
    public canAccept(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<DecideRequestItemValidationResult> {
        return Promise.resolve(
            DecideRequestItemValidationResult.fail(new DecideRequestItemValidationError("aCode", "aMessage"))
        )
    }

    public canReject(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<DecideRequestItemValidationResult> {
        return Promise.resolve(
            DecideRequestItemValidationResult.fail(new DecideRequestItemValidationError("aCode", "aMessage"))
        )
    }
}
