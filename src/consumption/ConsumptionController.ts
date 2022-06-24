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
import { ConsumptionAttributesController } from "../modules/attributes/ConsumptionAttributesController"
import { DraftsController } from "../modules/drafts/DraftsController"
import { IncomingRequestsController } from "../modules/requests/incoming/IncomingRequestsController"
import { ProcessorConstructor } from "../modules/requests/itemProcessors/ProcessorConstructor"
import { RequestItemConstructor } from "../modules/requests/itemProcessors/RequestItemConstructor"
import { RequestItemProcessorRegistry } from "../modules/requests/itemProcessors/RequestItemProcessorRegistry"
import { OutgoingRequestsController } from "../modules/requests/outgoing/OutgoingRequestsController"
import { SettingsController } from "../modules/settings/SettingsController"

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

        const processorRegistry = new RequestItemProcessorRegistry(
            this,
            requestItemProcessors.length === 0 ? this.getDefaultProcessors() : requestItemProcessors
        )
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

    private getDefaultProcessors() {
        return [
            {
                itemConstructor: CreateAttributeRequestItem,
                processorConstructor: CreateAttributeRequestItemProcessor
            },
            {
                itemConstructor: ReadAttributeRequestItem,
                processorConstructor: ReadAttributeRequestItemProcessor
            },
            {
                itemConstructor: ProposeAttributeRequestItem,
                processorConstructor: ProposeAttributeRequestItemProcessor
            },
            {
                itemConstructor: ShareAttributeRequestItem,
                processorConstructor: ShareAttributeRequestItemProcessor
            }
        ]
    }
}
