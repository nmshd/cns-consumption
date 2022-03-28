import { AccountController, Transport } from "@nmshd/transport"
import {
    // ConsumptionAttributesController,
    DraftsController,
    RelationshipInfoController,
    SettingsController,
    SharedItemsController
} from "../modules"
import { ConsumptionAttributesController } from "../modules/attributes/ConsumptionAttributesController"
import { RequestsController } from "../modules/requests/RequestsController"

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

    private _requests: RequestsController
    public get requests(): RequestsController {
        return this._requests
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
        this._requests = await new RequestsController(this).init()
        this._settings = await new SettingsController(this).init()
        this._sharedItems = await new SharedItemsController(this).init()
        this._relationshipInfo = await new RelationshipInfoController(this).init()
        return this
    }
}
