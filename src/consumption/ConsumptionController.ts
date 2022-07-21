import {
    CreateAttributeRequestItem,
    ProposeAttributeRequestItem,
    ReadAttributeRequestItem,
    ShareAttributeRequestItem
} from "@nmshd/content"
import { AccountController, Transport } from "@nmshd/transport"
import {
    CreateAttributeRequestItemProcessor,
    ProposeAttributeRequestItemProcessor,
    ReadAttributeRequestItemProcessor,
    ShareAttributeRequestItemProcessor
} from "../modules"
import { LocalAttributesController } from "../modules/attributes/LocalAttributesController"
import { DraftsController } from "../modules/drafts/DraftsController"
import { IncomingRequestsController } from "../modules/requests/incoming/IncomingRequestsController"
import { ProcessorConstructor } from "../modules/requests/itemProcessors/ProcessorConstructor"
import { RequestItemConstructor } from "../modules/requests/itemProcessors/RequestItemConstructor"
import { RequestItemProcessorRegistry } from "../modules/requests/itemProcessors/RequestItemProcessorRegistry"
import { OutgoingRequestsController } from "../modules/requests/outgoing/OutgoingRequestsController"
import { SettingsController } from "../modules/settings/SettingsController"

export class ConsumptionController {
    public constructor(public readonly transport: Transport, public readonly accountController: AccountController) {}

    private _attributes: LocalAttributesController
    public get attributes(): LocalAttributesController {
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
        requestItemProcessorOverrides = new Map<RequestItemConstructor, ProcessorConstructor>()
    ): Promise<ConsumptionController> {
        this._attributes = await new LocalAttributesController(
            this,
            this.transport.eventBus,
            this.accountController.identity
        ).init()
        this._drafts = await new DraftsController(this).init()

        const processorRegistry = new RequestItemProcessorRegistry(this, this.getDefaultProcessors())

        for (const [itemConstructor, processorConstructor] of requestItemProcessorOverrides) {
            processorRegistry.registerOrReplaceProcessor(itemConstructor, processorConstructor)
        }

        this._outgoingRequests = await new OutgoingRequestsController(
            await this.accountController.getSynchronizedCollection("Requests"),
            processorRegistry,
            this,
            this.transport.eventBus,
            this.accountController.identity
        ).init()
        this._incomingRequests = await new IncomingRequestsController(
            await this.accountController.getSynchronizedCollection("Requests"),
            processorRegistry,
            this,
            this.transport.eventBus,
            this.accountController.identity
        ).init()
        this._settings = await new SettingsController(this).init()
        return this
    }

    private getDefaultProcessors() {
        return new Map<RequestItemConstructor, ProcessorConstructor>([
            [CreateAttributeRequestItem, CreateAttributeRequestItemProcessor],
            [ReadAttributeRequestItem, ReadAttributeRequestItemProcessor],
            [ProposeAttributeRequestItem, ProposeAttributeRequestItemProcessor],
            [ShareAttributeRequestItem, ShareAttributeRequestItemProcessor]
        ])
    }
}
