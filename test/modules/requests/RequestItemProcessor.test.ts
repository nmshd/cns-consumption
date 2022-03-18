import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { RequestItemDecision } from "@nmshd/consumption"
import { IConfigOverwrite } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { MockRequestItemProcessor } from "./testHelpers/MockRequestItemProcessor"
import { TestRequestItem } from "./testHelpers/TestRequestItem"

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
            it("complete() delegates accepted item to accept method", async function () {
                const processor = new MockRequestItemProcessor()

                const item = await TestRequestItem.from({ mustBeAccepted: false })
                const acceptParams = {
                    decision: RequestItemDecision.Accept
                }

                await processor.complete(item, acceptParams)

                expect(processor.numberOfAcceptCalls).to.equal(1)
            })

            it("complete() delegates rejected item to reject method", async function () {
                const processor = new MockRequestItemProcessor()

                const item = await TestRequestItem.from({ mustBeAccepted: false })
                const rejectParams = {
                    decision: RequestItemDecision.Reject
                }

                await processor.complete(item, rejectParams)

                expect(processor.numberOfRejectCalls).to.equal(1)
            })
        })
    }
}
