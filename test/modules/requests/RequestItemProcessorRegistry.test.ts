import { GenericRequestItemProcessor, RequestItemProcessorRegistry } from "@nmshd/consumption"
import { AcceptResponseItem, IRequestItem, RejectResponseItem, RequestItem } from "@nmshd/content"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"
import { TestRequestItem } from "./testHelpers/TestRequestItem"

class TestRequestItemProcessor extends GenericRequestItemProcessor<TestRequestItem> {
    public override accept(): Promise<AcceptResponseItem> {
        throw new Error("Method not implemented.")
    }

    public override reject(): Promise<RejectResponseItem> {
        throw new Error("Method not implemented.")
    }
}

class TestRequestItemProcessor2 extends GenericRequestItemProcessor<TestRequestItem> {
    public override accept(): Promise<AcceptResponseItem> {
        throw new Error("Method not implemented.")
    }

    public override reject(): Promise<RejectResponseItem> {
        throw new Error("Method not implemented.")
    }
}

interface ITestRequestItemWithNoProcessor extends IRequestItem {}

class TestRequestItemWithNoProcessor extends RequestItem {
    public static override async from(item: ITestRequestItemWithNoProcessor): Promise<TestRequestItemWithNoProcessor> {
        return await super.fromT(item, TestRequestItemWithNoProcessor)
    }
}

export class RequestItemProcessorRegistryTests extends IntegrationTest {
    public run(): void {
        let registry: RequestItemProcessorRegistry

        beforeEach(function () {
            registry = new RequestItemProcessorRegistry()
        })

        describe("RequestItemProcessorRegistry", function () {
            // The following test is considered as passed when no exception occurs
            // eslint-disable-next-line jest/expect-expect
            it("registerProcessorForType can register processors", function () {
                registry.registerProcessor(TestRequestItemProcessor, TestRequestItem)
            })

            it("registerProcessorForType throws exception when registering multiple processors for the same Request Item type", function () {
                registry.registerProcessor(TestRequestItemProcessor, TestRequestItem)
                TestUtil.expectThrows(
                    () => registry.registerProcessor(TestRequestItemProcessor, TestRequestItem),
                    "There is already a processor registered for 'TestRequestItem'*"
                )
            })

            it("replaceProcessorForType allows replacing registered processors", function () {
                registry.registerProcessor(TestRequestItemProcessor, TestRequestItem)
                registry.replaceProcessor(TestRequestItemProcessor2, TestRequestItem)

                const processor = registry.getProcessorForItem(new TestRequestItem())

                expect(processor).to.be.instanceOf(TestRequestItemProcessor2)
            })

            it("getProcessorForItem returns an instance of the registered processor", async function () {
                registry.registerProcessor(TestRequestItemProcessor, TestRequestItem)

                const item = await TestRequestItem.from({
                    mustBeAccepted: true
                })

                const processor = registry.getProcessorForItem(item)

                expect(processor).to.exist
                expect(processor).to.be.instanceOf(TestRequestItemProcessor)
            })

            it("getProcessorForItem returns a new instance each time", async function () {
                registry.registerProcessor(TestRequestItemProcessor, TestRequestItem)

                const item = await TestRequestItem.from({
                    mustBeAccepted: true
                })

                const processor1 = registry.getProcessorForItem(item)
                const processor2 = registry.getProcessorForItem(item)

                expect(processor1).to.not.equal(processor2)
            })

            it("getProcessorForItem throws if no Processor was registered for the given Request Item", async function () {
                registry.registerProcessor(TestRequestItemProcessor, TestRequestItem)

                const item = await TestRequestItemWithNoProcessor.from({
                    mustBeAccepted: true
                })

                TestUtil.expectThrows(
                    () => registry.getProcessorForItem(item),
                    "There was no processor registered for 'TestRequestItemWithNoProcessor'"
                )
            })
        })
    }
}
