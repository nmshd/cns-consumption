import { RequestItem } from "@nmshd/content"
import { RequestItemProcessor } from "./itemProcessors/RequestItemProcessor"

type ProcessorConstructor = new () => RequestItemProcessor
type RequestItemConstructor = new () => RequestItem

export class RequestItemProcessorRegistry {
    private readonly registry: Record<string, ProcessorConstructor | undefined> = {}

    public getProcessorForItem(item: RequestItem): RequestItemProcessor {
        const constructor = this.registry[item.constructor.name]
        if (!constructor) {
            return new RequestItemProcessor()
        }
        return new constructor()
    }

    public registerProcessorForType(processor: ProcessorConstructor, forType: RequestItemConstructor): void {
        if (this.registry.hasOwnProperty(forType.name)) {
            throw new Error(
                `There is already a processor registered for '${forType.name}''. Use 'replaceProcessorForType' if you want to replace it.`
            )
        }
        this.registry[forType.name] = processor
    }

    public replaceProcessorForType(processor: ProcessorConstructor, forType: RequestItemConstructor): void {
        this.registry[forType.name] = processor
    }
}
