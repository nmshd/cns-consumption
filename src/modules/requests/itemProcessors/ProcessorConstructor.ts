import { IRequestItemProcessor } from "./IRequestItemProcessor"

export type ProcessorConstructor = new () => IRequestItemProcessor
