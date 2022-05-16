import { CoreDate, CoreId, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionErrors } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ICreateConsumptionAttributeParams } from "./CreateConsumptionAttributeParams"
import {
    CreateSharedConsumptionAttributeCopyParams,
    ICreateSharedConsumptionAttributeCopyParams
} from "./CreateSharedConsumptionAttributeCopyParams"
import { ConsumptionAttribute } from "./local/ConsumptionAttribute"
import { ConsumptionAttributeShareInfo } from "./local/ConsumptionAttributeShareInfo"
import {
    ISucceedConsumptionAttributeParams,
    SucceedConsumptionAttributeParams
} from "./SuccedConsumptionAttributeParams"

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

    public async getConsumptionAttribute(id: CoreId): Promise<ConsumptionAttribute | undefined> {
        const result = await this.attributes.findOne({
            [nameof<ConsumptionAttribute>((c) => c.id)]: id.toString()
        })

        if (!result) return
        return ConsumptionAttribute.from(result)
    }

    public async getConsumptionAttributes(query?: any): Promise<ConsumptionAttribute[]> {
        const attributes = await this.attributes.find(query)
        return await this.parseArray<ConsumptionAttribute>(attributes, ConsumptionAttribute)
    }

    public async getValidConsumptionAttributes(query?: any): Promise<ConsumptionAttribute[]> {
        const attributes = await this.attributes.find(query)
        const items = await this.parseArray<ConsumptionAttribute>(attributes, ConsumptionAttribute)
        return this.filterCurrent(items)
    }

    public async createConsumptionAttribute(params: ICreateConsumptionAttributeParams): Promise<ConsumptionAttribute> {
        const consumptionAttribute = await ConsumptionAttribute.fromParams(params)
        const newAttribute = await this.attributes.create(consumptionAttribute)
        return ConsumptionAttribute.from(newAttribute)
    }

    public async succeedConsumptionAttribute(
        params: ISucceedConsumptionAttributeParams
    ): Promise<ConsumptionAttribute> {
        const parsedParams = SucceedConsumptionAttributeParams.from(params)
        const current = await this.getConsumptionAttribute(parsedParams.succeeds)
        if (!current) {
            throw ConsumptionErrors.attributes.predecessorNotFound(parsedParams.succeeds.toString())
        }
        if (!parsedParams.validFrom) {
            parsedParams.validFrom = CoreDate.utc()
        }
        current.content.validTo = parsedParams.validFrom.subtract(1)
        await this.updateConsumptionAttribute(current)

        parsedParams.successorContent.validFrom = parsedParams.validFrom
        const successor = {
            attribute: parsedParams.successorContent,
            succeeds: parsedParams.succeeds
        } as ICreateConsumptionAttributeParams
        return await this.createConsumptionAttribute(successor)
    }

    public async createSharedConsumptionAttributeCopy(
        params: ICreateSharedConsumptionAttributeCopyParams
    ): Promise<ConsumptionAttribute> {
        const parsedParams = CreateSharedConsumptionAttributeCopyParams.from(params)
        const sourceAttribute = await this.getConsumptionAttribute(parsedParams.attributeId)
        if (!sourceAttribute) {
            throw ConsumptionErrors.attributes.predecessorNotFound(parsedParams.attributeId.toString())
        }
        const shareInfo = ConsumptionAttributeShareInfo.from({
            peer: parsedParams.peer,
            requestReference: parsedParams.requestReference,
            sourceAttribute: parsedParams.attributeId
        })
        const createConsumptionAttributeParams = {
            attribute: sourceAttribute.content,
            shareInfo: shareInfo
        } as ICreateConsumptionAttributeParams
        const sharedConsumptionAttributeCopy = await this.createConsumptionAttribute(createConsumptionAttributeParams)
        return ConsumptionAttribute.from(sharedConsumptionAttributeCopy)
    }

    public async updateConsumptionAttribute(attribute: ConsumptionAttribute): Promise<ConsumptionAttribute> {
        const current = await this.attributes.findOne({
            [nameof<ConsumptionAttribute>((c) => c.id)]: attribute.id.toString()
        })
        if (!current) {
            throw TransportErrors.general.recordNotFound(ConsumptionAttribute, attribute.id.toString())
        }
        const updatedAttribute = await this.attributes.update(current, attribute)
        return ConsumptionAttribute.from(updatedAttribute)
    }

    public async deleteAttribute(attribute: ConsumptionAttribute): Promise<void> {
        await this.attributes.delete(attribute)
    }
}
