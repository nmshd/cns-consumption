import { SerializableAsync } from "@js-soft/ts-serval"
import { CoreDate, CoreId, SynchronizedCollection } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { Draft } from "./local/Draft"

export class DraftsController extends ConsumptionBaseController {
    private drafts: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.DraftsController, parent)
    }

    public async init(): Promise<DraftsController> {
        await super.init()

        this.drafts = await this.parent.accountController.getSynchronizedCollection("Drafts")
        return this
    }

    public async getDraft(id: CoreId): Promise<Draft | undefined> {
        const result = await this.drafts.read(id.toString())
        return result ? await Draft.from(result) : undefined
    }

    public async getDrafts(query?: any): Promise<Draft[]> {
        const items = await this.drafts.find(query)
        return await this.parseArray<Draft>(items, Draft)
    }

    public async createDraft(content: SerializableAsync, type = ""): Promise<Draft> {
        const draft = await Draft.from({
            id: await ConsumptionIds.draft.generate(),
            content: content,
            createdAt: new CoreDate(),
            lastModifiedAt: new CoreDate(),
            type: type
        })
        await this.drafts.create(draft)
        return draft
    }

    public async updateDraft(draft: Draft): Promise<void> {
        const oldDraft = await this.drafts.read(draft.id.toString())
        if (!oldDraft) {
            throw new Error("Draft Not Found")
        }
        await this.drafts.update(oldDraft, draft)
    }

    public async deleteDraft(draft: Draft): Promise<void> {
        await this.drafts.delete(draft)
    }
}
