import { AccountController, Transport } from "@nmshd/transport"
import {
    ConsumptionAttributesController,
    DraftsController,
    OutgoingRequestsController,
    ProcessorConstructor,
    RequestItemConstructor,
    RequestItemProcessorRegistry,
    SettingsController
} from "../modules"
import { IncomingRequestsController } from "../modules/requests/incoming/IncomingRequestsController"

export class ConsumptionController {
    public constructor(public readonly transport: Transport, public readonly accountController: AccountController) {}

    private _attributes: ConsumptionAttributesController
    public get attributes(): ConsumptionAttributesController {
        return this._attributes
    }

    private _drafts: DraftsController
    public get drafts(): DraftsController {
        return this._drafts
    }

    private _outgoingRequests: OutgoingRequestsController
    public get outgoingRequests(): OutgoingRequestsController {
        return this._outgoingRequests
    }

    private _incomingRequests: IncomingRequestsController
    public get incomingRequests(): IncomingRequestsController {
        return this._incomingRequests
    }

    private _settings: SettingsController
    public get settings(): SettingsController {
        return this._settings
    }

    public async init(
        requestItemProcessors: {
            processorConstructor: ProcessorConstructor
            itemConstructor: RequestItemConstructor
        }[] = []
    ): Promise<ConsumptionController> {
        this._attributes = await new ConsumptionAttributesController(this).init()
        this._drafts = await new DraftsController(this).init()
        const processorRegistry = new RequestItemProcessorRegistry(this, requestItemProcessors)
        this._outgoingRequests = await new OutgoingRequestsController(
            await this.accountController.getSynchronizedCollection("Requests"),
            processorRegistry,
            this
        ).init()
        this._incomingRequests = await new IncomingRequestsController(
            await this.accountController.getSynchronizedCollection("Requests"),
            processorRegistry,
            this
        ).init()
        this._settings = await new SettingsController(this).init()
        return this
    }
}
