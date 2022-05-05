import { CoreId, SynchronizedCollection } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionErrors } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { RelationshipInfo } from "./local/RelationshipInfo"
import { RelationshipInfoUtil } from "./RelationshipInfoUtil"

export class RelationshipInfoController extends ConsumptionBaseController {
    private relationshipInfo: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.RelationshipInfoController, parent)
    }

    public override async init(): Promise<this> {
        await super.init()

        this.relationshipInfo = await this.parent.accountController.getSynchronizedCollection("RelationshipInfo")
        return this
    }

    public async getRelationshipInfo(id: CoreId): Promise<RelationshipInfo | undefined> {
        const result = await this.relationshipInfo.read(id.toString())
        return result ? RelationshipInfo.from(result) : undefined
    }

    public async getRelationshipInfoByRelationship(relationshipId: CoreId): Promise<RelationshipInfo | undefined> {
        const info = await new RelationshipInfoUtil(this.parent).createInitialRelationshipInfo(relationshipId)
        return info
        /*
        // So far, do not store the relationshipInfo, as they wouldn't be updated correctly

        const result = await this.relationshipInfo.findOne({ relationshipId: relationshipId.toString() })

        if (result) {
            return await RelationshipInfo.from(result)
        }

        const info = await new RelationshipInfoUtil(this.parent).createInitialRelationshipInfo(relationshipId)
        await this.relationshipInfo.create(info)
        return info
        */
    }

    public async getRelationshipInfos(query?: any): Promise<RelationshipInfo[]> {
        const items = await this.relationshipInfo.find(query)
        return await this.parseArray<RelationshipInfo>(items, RelationshipInfo)
    }

    public async createRelationshipInfo(relationshipInfo: RelationshipInfo): Promise<RelationshipInfo> {
        const exists = await this.relationshipInfo.exists({ relationshipId: relationshipInfo.relationshipId })
        if (exists) {
            throw ConsumptionErrors.relationshipInfo.relationshipInfoExists(relationshipInfo.relationshipId.toString())
        }

        await this.relationshipInfo.create(relationshipInfo)
        return relationshipInfo
    }

    public async updateRelationshipInfo(relationshipInfo: RelationshipInfo): Promise<void> {
        const oldRelationshipInfo = await this.relationshipInfo.read(relationshipInfo.id.toString())
        if (!oldRelationshipInfo) {
            throw new Error("RelationshipInfo Not Found")
        }
        await this.relationshipInfo.update(oldRelationshipInfo, relationshipInfo)
    }

    public async deleteRelationshipInfo(relationshipInfo: RelationshipInfo): Promise<void> {
        await this.relationshipInfo.delete(relationshipInfo)
    }
}
