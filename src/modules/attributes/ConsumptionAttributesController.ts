import { Attribute } from "@nmshd/content"
import { CoreDate, CoreId, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionErrors } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ConsumptionAttribute } from "./local/ConsumptionAttribute"

export class ConsumptionAttributesController extends ConsumptionBaseController {
    private attributes: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.ConsumptionAttributesController, parent)
    }

    public override async init(): Promise<ConsumptionAttributesController> {
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
        const result = await this.attributes.find({
            [nameof<ConsumptionAttribute>((c) => c.id)]: id.toString()
        })

        const attributes = await this.parseArray<ConsumptionAttribute>(result, ConsumptionAttribute)
        return this.findCurrent(attributes)
    }

    public async getAttributeByName(name: string): Promise<ConsumptionAttribute | undefined> {
        const result = await this.attributes.find({
            [`${nameof<ConsumptionAttribute>((c) => c.content)}.${nameof<Attribute>((a) => a.name)}`]: name
        })

        const attributes = await this.parseArray<ConsumptionAttribute>(result, ConsumptionAttribute)
        return this.findCurrent(attributes)
    }

    public async getAttributeHistoryByName(name: string): Promise<ConsumptionAttribute[]> {
        const result = await this.attributes.find({
            [`${nameof<ConsumptionAttribute>((c) => c.content)}.${nameof<Attribute>((a) => a.name)}`]: name
        })

        const attributes = await this.parseArray<ConsumptionAttribute>(result, ConsumptionAttribute)
        const sorted = attributes.sort((a, b) => {
            return a.createdAt.compare(b.createdAt)
        })
        return sorted
    }

    public async getAttributes(query?: any): Promise<ConsumptionAttribute[]> {
        const items = await this.attributes.find(query)
        return await this.parseArray<ConsumptionAttribute>(items, ConsumptionAttribute)
    }

    public async getValidAttributes(query?: any): Promise<ConsumptionAttribute[]> {
        const docs = await this.attributes.find(query)
        const items = await this.parseArray<ConsumptionAttribute>(docs, ConsumptionAttribute)
        return this.filterCurrent(items)
    }

    public async getAttributesByName(query?: any): Promise<Record<string, ConsumptionAttribute>> {
        const attributes = await this.getValidAttributes(query)

        const mapper = (result: any, attribute: ConsumptionAttribute) => {
            result[attribute.content.name] = attribute
            return result
        }

        return attributes.reduce(mapper, {} as any)
    }

    public async createAttribute(attribute: ConsumptionAttribute): Promise<ConsumptionAttribute> {
        const current = await this.getAttributeByName(attribute.content.name)
        if (current) {
            throw ConsumptionErrors.attributes.attributeExists(attribute.content.name)
        }
        await this.attributes.create(attribute)
        return attribute
    }

    public async succeedAttribute(
        attribute: ConsumptionAttribute,
        validFrom?: CoreDate
    ): Promise<ConsumptionAttribute> {
        const current = await this.getAttributeByName(attribute.content.name)
        if (current && !validFrom) {
            validFrom = CoreDate.utc()
        }
        if (current) {
            attribute.content.validFrom = validFrom
            current.content.validTo = validFrom
            await this.updateAttribute(current)
        }
        await this.attributes.create(attribute)
        return attribute
    }

    public async updateAttribute(attribute: ConsumptionAttribute): Promise<ConsumptionAttribute> {
        const current = await this.attributes.findOne({
            [nameof<ConsumptionAttribute>((c) => c.id)]: attribute.id.toString()
        })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionAttribute, attribute.id.toString())
        }
        await this.attributes.update(current, attribute)
        return attribute
    }

    public async deleteAttribute(attribute: ConsumptionAttribute): Promise<void> {
        await this.attributes.delete(attribute)
    }
}
