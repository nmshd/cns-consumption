import { RequestItem } from "@nmshd/content"
import { IRequestItemProcessor } from "./IRequestItemProcessor"

type ProcessorConstructor = new () => IRequestItemProcessor
type RequestItemConstructor = new () => RequestItem

export class RequestItemProcessorRegistry {
    private readonly registry: Record<string, ProcessorConstructor | undefined> = {}

    public registerProcessor(
        processorConstructor: ProcessorConstructor,
        itemConstructor: RequestItemConstructor
    ): void {
        if (this.registry.hasOwnProperty(itemConstructor.name)) {
            throw new Error(
                `There is already a processor registered for '${itemConstructor.name}''. Use 'replaceProcessorForType' if you want to replace it.`
            )
        }
        this.registry[itemConstructor.name] = processorConstructor
    }

    public replaceProcessor(processorConstructor: ProcessorConstructor, itemConstructor: RequestItemConstructor): void {
        this.registry[itemConstructor.name] = processorConstructor
    }

    public getProcessorForItem(item: RequestItem): IRequestItemProcessor {
        const constructor = this.registry[item.constructor.name]
        if (!constructor) {
            throw new Error(`There was no processor registered for '${item.constructor.name}'.`)
        }
        return new constructor()
    }
}
