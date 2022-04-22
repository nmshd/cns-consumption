import { RequestItem } from "@nmshd/content"
import { IRequestItemProcessor } from "./IRequestItemProcessor"

type ProcessorConstructor = new () => IRequestItemProcessor
type RequestItemConstructor = new () => RequestItem

export class RequestItemProcessorRegistry {
    private readonly registry: Record<string, ProcessorConstructor | undefined> = {}

    public getProcessorForItem(item: RequestItem): IRequestItemProcessor {
        const constructor = this.registry[item.constructor.name]
        if (!constructor) {
            throw new Error(`There was no processor registered for '${item.constructor.name}'.`)
        }
        return new constructor()
    }

    public registerProcessor(processor: ProcessorConstructor, requestItemType: RequestItemConstructor): void {
        if (this.registry.hasOwnProperty(requestItemType.name)) {
            throw new Error(
                `There is already a processor registered for '${requestItemType.name}''. Use 'replaceProcessorForType' if you want to replace it.`
            )
        }
        this.registry[requestItemType.name] = processor
    }

    public replaceProcessor(processor: ProcessorConstructor, forType: RequestItemConstructor): void {
        this.registry[forType.name] = processor
    }
}
