import {
    IdentityAttributeQuery,
    IIdentityAttributeQuery,
    IRelationshipAttributeQuery,
    RelationshipAttributeQuery
} from "@nmshd/content"
import { CoreDate, CoreId, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import {
    ConsumptionBaseController,
    ConsumptionControllerName,
    ConsumptionErrors,
    ConsumptionIds
} from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ICreateLocalAttributeParams } from "./local/CreateLocalAttributeParams"
import { ICreatePeerLocalAttributeParams } from "./local/CreatePeerLocalAttributeParams"
import {
    CreateSharedLocalAttributeCopyParams,
    ICreateSharedLocalAttributeCopyParams
} from "./local/CreateSharedLocalAttributeCopyParams"
import { LocalAttribute } from "./local/LocalAttribute"
import { LocalAttributeShareInfo } from "./local/LocalAttributeShareInfo"
import { IdentityAttributeQueryTranslator, RelationshipAttributeQueryTranslator } from "./local/QueryTranslator"
import { ISucceedLocalAttributeParams, SucceedLocalAttributeParams } from "./local/SucceedLocalAttributeParams"
import { IUpdateLocalAttributeParams } from "./local/UpdateLocalAttributeParams"

export class LocalAttributesController extends ConsumptionBaseController {
    private attributes: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.LocalAttributesController, parent)
    }

    public override async init(): Promise<this> {
        await super.init()

        this.attributes = await this.parent.accountController.getSynchronizedCollection("Attributes")

        return this
    }

    public checkValid(attribute: LocalAttribute): boolean {
        const now = CoreDate.utc()
        if (!attribute.content.validFrom && !attribute.content.validTo) {
            return true
        } else if (
            attribute.content.validFrom &&
            !attribute.content.validTo &&
            attribute.content.validFrom.isSameOrBefore(now)
        ) {
            return true
        } else if (
            !attribute.content.validFrom &&
            attribute.content.validTo &&
            attribute.content.validTo.isSameOrAfter(now)
        ) {
            return true
        } else if (
            attribute.content.validFrom &&
            attribute.content.validTo &&
            attribute.content.validFrom.isSameOrBefore(now) &&
            attribute.content.validTo.isSameOrAfter(now)
        ) {
            return true
        }
        return false
    }

    public findCurrent(attributes: LocalAttribute[]): LocalAttribute | undefined {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt)
        })
        let current: LocalAttribute | undefined
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                current = attribute
            }
        }
        return current
    }

    public filterCurrent(attributes: LocalAttribute[]): LocalAttribute[] {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt)
        })

        const items = []
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                items.push(attribute)
            }
        }
        return items
    }

    public async getLocalAttribute(id: CoreId): Promise<LocalAttribute | undefined> {
        const result = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: id.toString()
        })

        if (!result) return
        return LocalAttribute.from(result)
    }

    public async getLocalAttributes(query?: any): Promise<LocalAttribute[]> {
        const attributes = await this.attributes.find(query)
        return await this.parseArray(attributes, LocalAttribute)
    }

    public async getValidLocalAttributes(query?: any): Promise<LocalAttribute[]> {
        const attributes = await this.attributes.find(query)
        const items = await this.parseArray(attributes, LocalAttribute)
        return this.filterCurrent(items)
    }

    public async executeRelationshipAttributeQuery(query: IRelationshipAttributeQuery): Promise<LocalAttribute[]> {
        const parsedQuery = RelationshipAttributeQuery.from(query)

        const dbQuery = RelationshipAttributeQueryTranslator.translate(parsedQuery)

        const attributes = await this.attributes.find(dbQuery)

        return await this.parseArray(attributes, LocalAttribute)
    }

    public async executeIdentityAttributeQuery(query: IIdentityAttributeQuery): Promise<LocalAttribute[]> {
        const parsedQuery = IdentityAttributeQuery.from(query)

        const dbQuery = IdentityAttributeQueryTranslator.translate(parsedQuery)

        const attributes = await this.attributes.find(dbQuery)

        return await this.parseArray(attributes, LocalAttribute)
    }

    public async createLocalAttribute(params: ICreateLocalAttributeParams): Promise<LocalAttribute> {
        const localAttribute = await LocalAttribute.fromAttribute(params.content)
        await this.attributes.create(localAttribute)
        return localAttribute
    }

    public async succeedLocalAttribute(params: ISucceedLocalAttributeParams): Promise<LocalAttribute> {
        const parsedParams = SucceedLocalAttributeParams.from(params)
        const current = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: params.succeeds.toString()
        })
        if (!current) {
            throw ConsumptionErrors.attributes.predecessorNotFound(parsedParams.succeeds.toString())
        }
        if (!parsedParams.successorContent.validFrom) {
            parsedParams.successorContent.validFrom = CoreDate.utc()
        }
        const validFrom = parsedParams.successorContent.validFrom
        const currentUpdated = LocalAttribute.from(current)
        currentUpdated.content.validTo = validFrom.subtract(1)
        await this.attributes.update(current, currentUpdated)

        const successor = await LocalAttribute.fromAttribute(parsedParams.successorContent, parsedParams.succeeds)
        await this.attributes.create(successor)
        return successor
    }

    public async createSharedLocalAttributeCopy(
        params: ICreateSharedLocalAttributeCopyParams
    ): Promise<LocalAttribute> {
        const parsedParams = CreateSharedLocalAttributeCopyParams.from(params)
        const sourceAttribute = await this.getLocalAttribute(parsedParams.sourceAttributeId)
        if (!sourceAttribute) {
            throw ConsumptionErrors.attributes.predecessorNotFound(parsedParams.sourceAttributeId.toString())
        }
        const shareInfo = LocalAttributeShareInfo.from({
            peer: parsedParams.peer,
            requestReference: parsedParams.requestReference,
            sourceAttribute: parsedParams.sourceAttributeId
        })

        const sharedLocalAttributeCopy = await LocalAttribute.fromAttribute(
            sourceAttribute.content,
            undefined,
            shareInfo,
            parsedParams.attributeId
        )
        await this.attributes.create(sharedLocalAttributeCopy)
        return sharedLocalAttributeCopy
    }

    public async createPeerLocalAttribute(params: ICreatePeerLocalAttributeParams): Promise<LocalAttribute> {
        const shareInfo = LocalAttributeShareInfo.from({
            peer: params.peer,
            requestReference: params.requestReference
        })
        const peerLocalAttribute = LocalAttribute.from({
            id: params.id ?? (await ConsumptionIds.attribute.generate()),
            content: params.content,
            shareInfo: shareInfo,
            createdAt: CoreDate.utc()
        })
        await this.attributes.create(peerLocalAttribute)
        return peerLocalAttribute
    }

    public async updateLocalAttribute(params: IUpdateLocalAttributeParams): Promise<LocalAttribute> {
        const current = await this.attributes.findOne({
            [nameof<LocalAttribute>((c) => c.id)]: params.id.toString()
        })
        if (!current) {
            throw TransportErrors.general.recordNotFound(LocalAttribute, params.id.toString())
        }
        const updatedLocalAttribute = LocalAttribute.from({
            id: current.id,
            content: params.content,
            createdAt: current.createdAt,
            shareInfo: current.shareInfo,
            succeededBy: current.succeededBy,
            succeeds: current.succeeds
        })
        await this.attributes.update(current, updatedLocalAttribute)
        return updatedLocalAttribute
    }

    public async deleteAttribute(attribute: LocalAttribute): Promise<void> {
        await this.attributes.delete(attribute)
    }
}
