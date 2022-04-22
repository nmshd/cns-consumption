import { AccountController, Transport } from "@nmshd/transport"
import {
    ConsumptionAttributesController,
    DraftsController,
    OutgoingRequestsController,
    RelationshipInfoController,
    RequestItemProcessorRegistry,
    SettingsController,
    SharedItemsController
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

    private _sharedItems: SharedItemsController
    public get sharedItems(): SharedItemsController {
        return this._sharedItems
    }

    private _relationshipInfo: RelationshipInfoController
    public get relationshipInfo(): RelationshipInfoController {
        return this._relationshipInfo
    }

    public async init(): Promise<ConsumptionController> {
        this._attributes = await new ConsumptionAttributesController(this).init()
        this._drafts = await new DraftsController(this).init()
        const processorRegistry = new RequestItemProcessorRegistry()
        this._outgoingRequests = await new OutgoingRequestsController(this, processorRegistry).init()
        this._incomingRequests = await new IncomingRequestsController(this, processorRegistry).init()
        this._settings = await new SettingsController(this).init()
        this._sharedItems = await new SharedItemsController(this).init()
        this._relationshipInfo = await new RelationshipInfoController(this).init()
        return this
    }
}
