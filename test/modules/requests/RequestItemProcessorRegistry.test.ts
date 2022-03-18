import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { RequestItemProcessor, RequestItemProcessorRegistry } from "@nmshd/consumption"
import { IRequestItem, RequestItem, ResponseItem } from "@nmshd/content"
import { IConfigOverwrite } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestRequestItem } from "./testHelpers/TestRequestItem"

class TestRequestItemProcessor extends RequestItemProcessor<TestRequestItem> {
    public accept(): Promise<ResponseItem> {
        throw new Error("Method not implemented.")
    }

    public reject(): Promise<ResponseItem> {
        throw new Error("Method not implemented.")
    }
}

class TestRequestItemProcessor2 extends RequestItemProcessor<TestRequestItem> {
    public accept(): Promise<ResponseItem> {
        throw new Error("Method not implemented.")
    }

    public reject(): Promise<ResponseItem> {
        throw new Error("Method not implemented.")
    }
}

interface ITestRequestItemWithNoProcessor extends IRequestItem {}

class TestRequestItemWithNoProcessor extends RequestItem {
    public static async from(item: ITestRequestItemWithNoProcessor): Promise<TestRequestItemWithNoProcessor> {
        return await super.fromT(item, TestRequestItemWithNoProcessor)
    }
}

export class RequestItemProcessorRegistryTests extends IntegrationTest {
    public constructor(
        protected config: IConfigOverwrite,
        protected connection: IDatabaseConnection,
        protected loggerFactory: ILoggerFactory
    ) {
        super(config, connection, loggerFactory)
    }

    public run(): void {
        let registry: RequestItemProcessorRegistry
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

        beforeEach(function () {
            registry = new RequestItemProcessorRegistry()
        })

        describe("RequestItemProcessorRegistry", function () {
            // The following test is considered as passed when no exception occurs
            // eslint-disable-next-line jest/expect-expect
            it("registerProcessorForType can register processors", function () {
                registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem)
            })

            it("registerProcessorForType throws exception when registering multiple processors for the same Request Item type", function () {
                registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem)
                TestUtil.expectThrows(
                    () => registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem),
                    "There is already a processor registered for 'TestRequestItem'*"
                )
            })

            it("replaceProcessorForType allows replacing registered processors", function () {
                registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem)
                registry.replaceProcessorForType(TestRequestItemProcessor2, TestRequestItem)

                const processor = registry.getProcessorForItem(new TestRequestItem())

                expect(processor).to.be.instanceOf(TestRequestItemProcessor2)
            })

            it("getProcessorForItem returns an instance of the registered processor", async function () {
                registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem)

                const item = await TestRequestItem.from({
                    mustBeAccepted: true
                })

                const processor = registry.getProcessorForItem(item)

                expect(processor).to.exist
                expect(processor).to.be.instanceOf(TestRequestItemProcessor)
            })

            it("getProcessorForItem returns a new instance each time", async function () {
                registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem)

                const item = await TestRequestItem.from({
                    mustBeAccepted: true
                })

                const processor1 = registry.getProcessorForItem(item)
                const processor2 = registry.getProcessorForItem(item)

                expect(processor1).to.not.equal(processor2)
            })

            it("getProcessorForItem defaults to RequestItemProcessor if no Processor was registered for the given Request Item", async function () {
                registry.registerProcessorForType(TestRequestItemProcessor, TestRequestItem)

                const item = await TestRequestItemWithNoProcessor.from({
                    mustBeAccepted: true
                })

                const processor = registry.getProcessorForItem(item)
                expect(processor).to.be.instanceOf(RequestItemProcessor)
            })
        })
    }
}

// interface Account {
//     accountController: AccountController
//     consumptionController: ConsumptionController
// }
