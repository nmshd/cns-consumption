import { AbstractAttributeQuery } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionErrors } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ConsumptionAttribute } from "./local/ConsumptionAttribute"
import { ConsumptionAttributeShareInfo } from "./local/ConsumptionAttributeShareInfo"

export class ConsumptionAttributesController extends ConsumptionBaseController {
    private attributes: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.ConsumptionAttributesController, parent)
    }

    public override async init(): Promise<this> {
        await super.init()

        this.attributes = await this.parent.accountController.getSynchronizedCollection("Attributes")

        return this
    }

    public checkValid(attribute: ConsumptionAttribute): boolean {
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
            attribute.content.validTo.isAfter(now)
        ) {
            return true
        } else if (
            attribute.content.validFrom &&
            attribute.content.validTo &&
            attribute.content.validFrom.isSameOrBefore(now) &&
            attribute.content.validTo.isAfter(now)
        ) {
            return true
        }
        return false
    }

    public findCurrent(attributes: ConsumptionAttribute[]): ConsumptionAttribute | undefined {
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt)
        })
        let current: ConsumptionAttribute | undefined
        for (const attribute of sorted) {
            if (this.checkValid(attribute)) {
                current = attribute
            }
        }
        return current
    }

    public filterCurrent(attributes: ConsumptionAttribute[]): ConsumptionAttribute[] {
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

    public async getAttribute(id: CoreId): Promise<ConsumptionAttribute | undefined> {
        const result = await this.attributes.findOne({
            [nameof<ConsumptionAttribute>((c) => c.id)]: id.toString()
        })

        if (result) {
            return ConsumptionAttribute.from(result)
        }
        return result
    }

    public async getAttributes<TQuery extends AbstractAttributeQuery = AbstractAttributeQuery>(
        query?: TQuery
    ): Promise<ConsumptionAttribute[]> {
        const items = await this.attributes.find(query)
        return await this.parseArray<ConsumptionAttribute>(items, ConsumptionAttribute)
    }

    public async getValidAttributes<TQuery extends AbstractAttributeQuery = AbstractAttributeQuery>(
        query?: TQuery
    ): Promise<ConsumptionAttribute[]> {
        const docs = await this.attributes.find(query)
        const items = await this.parseArray<ConsumptionAttribute>(docs, ConsumptionAttribute)
        return this.filterCurrent(items)
    }

    public async createAttribute(attribute: ConsumptionAttribute): Promise<ConsumptionAttribute> {
        const current = await this.getAttribute(attribute.id)
        if (current) {
            throw ConsumptionErrors.attributes.attributeExists(attribute.id.toString())
        }
        const newAttribute = await this.attributes.create(attribute)
        const a = ConsumptionAttribute.from(newAttribute)
        return a
    }

    public async succeedAttribute(
        id: CoreId,
        successor: ConsumptionAttribute,
        validFrom?: CoreDate
    ): Promise<ConsumptionAttribute> {
        const current = await this.getAttribute(id)
        if (current && !validFrom) {
            validFrom = CoreDate.utc()
        }
        if (current) {
            successor.content.validFrom = validFrom
            current.content.validTo = validFrom
            await this.updateAttribute(current)
        }
        const createdAttribute = await this.attributes.create(successor)
        const a = ConsumptionAttribute.from(createdAttribute)
        return a
    }

    public async createSharedConsumptionAttributeCopy(
        attribute: ConsumptionAttribute,
        peer: CoreAddress,
        requestReference: CoreId
    ): Promise<ConsumptionAttribute> {
        const consumptionAttributeCopy = await ConsumptionAttribute.fromAttribute(attribute.content) // TODO was passiert wenn ein predecessor geteilt wird?
        consumptionAttributeCopy.succeeds = attribute.succeeds
        consumptionAttributeCopy.shareInfo = ConsumptionAttributeShareInfo.from({
            peer: peer,
            requestReference: requestReference,
            sourceAttribute: attribute.id
        })
        return await this.createAttribute(consumptionAttributeCopy)
    }

    public async updateAttribute(attribute: ConsumptionAttribute): Promise<ConsumptionAttribute> {
        const current = await this.attributes.findOne({
            [nameof<ConsumptionAttribute>((c) => c.id)]: attribute.id.toString()
        })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionAttribute, attribute.id.toString())
        }
        return ConsumptionAttribute.from(await this.attributes.update(current, attribute))
    }

    public async deleteAttribute(attribute: ConsumptionAttribute): Promise<void> {
        await this.attributes.delete(attribute)
    }
}
