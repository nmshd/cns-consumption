import { ConsumptionBaseController, ConsumptionControllerName } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"

export class OffboardingFlowController extends ConsumptionBaseController {
    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OffboardingFlowController, parent)
    }

    public async init(): Promise<OffboardingFlowController> {
        await super.init()

        return this
    }
}
