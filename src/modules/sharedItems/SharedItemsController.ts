import { CoreId, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { SharedItem } from "./local/SharedItem"

export class SharedItemsController extends ConsumptionBaseController {
    private sharedItems: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.SharedItemsController, parent)
    }

    public override async init(): Promise<SharedItemsController> {
        await super.init()

        this.sharedItems = await this.parent.accountController.getSynchronizedCollection("SharedItems")
        return this
    }

    public async getSharedItem(id: CoreId): Promise<SharedItem | undefined> {
        const result = await this.sharedItems.read(id.toString())
        return result ? await SharedItem.from(result) : undefined
    }

    public async getSharedItems(query?: any): Promise<SharedItem[]> {
        const items = await this.sharedItems.find(query)
        return await this.parseArray<SharedItem>(items, SharedItem)
    }

    public async createSharedItem(sharedItem: SharedItem): Promise<SharedItem> {
        await this.sharedItems.create(sharedItem)
        return sharedItem
    }

    public async updateSharedItem(sharedItem: SharedItem): Promise<SharedItem> {
        const oldSharedItem = await this.sharedItems.read(sharedItem.id.toString())
        if (!oldSharedItem) {
            throw TransportErrors.general.recordNotFound(SharedItem, sharedItem.id.toString())
        }
        return await this.sharedItems.update(oldSharedItem, sharedItem)
    }

    public async deleteSharedItem(sharedItem: SharedItem): Promise<void> {
        await this.sharedItems.delete(sharedItem)
    }
}
