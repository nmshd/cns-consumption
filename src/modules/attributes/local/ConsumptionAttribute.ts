import { serialize, type, validate } from "@js-soft/ts-serval"
import { Attribute, IAttribute } from "@nmshd/content"
import { CoreDate, CoreSynchronizable, ICoreDate, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionIds } from "../../../consumption"

export interface IConsumptionAttribute extends ICoreSynchronizable {
    content: IAttribute
    createdAt: ICoreDate
    metadata?: any
    metadataModifiedAt?: ICoreDate
}

@type("ConsumptionAttribute")
export class ConsumptionAttribute extends CoreSynchronizable implements IConsumptionAttribute {
    public readonly technicalProperties = ["@type", "@context", nameof<ConsumptionAttribute>((r) => r.createdAt)]

    public readonly userdataProperties = [nameof<ConsumptionAttribute>((r) => r.content)]

    public readonly metadataProperties = [
        nameof<ConsumptionAttribute>((r) => r.metadata),
        nameof<ConsumptionAttribute>((r) => r.metadataModifiedAt)
    ]

    @validate()
    @serialize({ type: Attribute })
    public content: Attribute

    @validate()
    @serialize()
    public createdAt: CoreDate

    @validate({ nullable: true })
    @serialize({ any: true })
    public metadata?: any

    @validate({ nullable: true })
    @serialize()
    public metadataModifiedAt?: CoreDate

    public static async from(value: IConsumptionAttribute): Promise<ConsumptionAttribute> {
        return (await super.from(value, ConsumptionAttribute)) as ConsumptionAttribute
    }

    public static async fromAttribute(attribute: IAttribute): Promise<ConsumptionAttribute> {
        return await this.from({
            content: Attribute.from(attribute),
            id: await ConsumptionIds.attribute.generate(),
            createdAt: CoreDate.utc()
        })
    }
}
