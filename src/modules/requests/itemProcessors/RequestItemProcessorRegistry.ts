import { RequestItem } from "@nmshd/content"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { IRequestItemProcessor } from "./IRequestItemProcessor"
import { ProcessorConstructor } from "./ProcessorConstructor"
import { RequestItemConstructor } from "./RequestItemConstructor"

export class RequestItemProcessorRegistry {
    public constructor(
        private readonly consumptionController: ConsumptionController,
        private readonly processors = new Map<RequestItemConstructor, ProcessorConstructor | undefined>
    ) {}

    public registerProcessor(
        processorConstructor: ProcessorConstructor,
        itemConstructor: RequestItemConstructor
    ): void {
        if (this.processors.has(itemConstructor)) {
            throw new Error(
                `There is already a processor registered for '${itemConstructor.name}''. Use 'replaceProcessorForType' if you want to replace it.`
            )
        }
        this.processors.set(itemConstructor, processorConstructor)
    }

    public registerOrReplaceProcessor(
        processorConstructor: ProcessorConstructor,
        itemConstructor: RequestItemConstructor
    ): void {
        this.processors.set(itemConstructor, processorConstructor)
    }

    public getProcessorForItem(item: RequestItem): IRequestItemProcessor {
        const constructor = this.processors.get(item.constructor as RequestItemConstructor)
        if (!constructor) {
            throw new Error(`There was no processor registered for '${item.constructor.name}'.`)
        }
        return new constructor(this.consumptionController)
    }
}
