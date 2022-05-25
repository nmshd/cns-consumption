import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { IRequestItemProcessor } from "./IRequestItemProcessor"

export type ProcessorConstructor = new (consumptionController: ConsumptionController) => IRequestItemProcessor
