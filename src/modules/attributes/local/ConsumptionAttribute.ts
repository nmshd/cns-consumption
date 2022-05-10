import { serialize, type, validate } from "@js-soft/ts-serval"
import { AbstractAttribute, IAbstractAttribute } from "@nmshd/content"
import { CoreDate, CoreId, CoreSynchronizable, ICoreDate, ICoreId, ICoreSynchronizable } from "@nmshd/transport"
import { nameof } from "ts-simple-nameof"
import { ConsumptionIds } from "../../../consumption"
import { ConsumptionAttributeShareInfo, IConsumptionAttributeShareInfo } from "./ConsumptionAttributeShareInfo"

// TODO: extend
export interface IConsumptionAttribute<TIAttribute extends IAbstractAttribute = IAbstractAttribute>
    extends ICoreSynchronizable {
    content: TIAttribute
    createdAt: ICoreDate
    succeeds?: ICoreId
    succeededBy?: ICoreId
    shareInfo?: IConsumptionAttributeShareInfo
}

@type("ConsumptionAttribute")
export class ConsumptionAttribute<TAttribute extends AbstractAttribute = AbstractAttribute>
    extends CoreSynchronizable
    implements IConsumptionAttribute
{
    public override readonly technicalProperties = [
        "@type",
        "@context",
        nameof<ConsumptionAttribute>((r) => r.createdAt)
    ]

    public override readonly userdataProperties = [nameof<ConsumptionAttribute>((r) => r.content)]

    @validate()
    @serialize({ type: AbstractAttribute })
    public content: TAttribute

    @validate()
    @serialize()
    public createdAt: CoreDate

    @validate({ nullable: true })
    @serialize()
    public succeeds?: CoreId

    @validate({ nullable: true })
    @serialize()
    public succeededBy?: CoreId

    @validate({ nullable: true })
    @serialize()
    public shareInfo?: ConsumptionAttributeShareInfo

    public static override async from<
        TAttribute extends AbstractAttribute = AbstractAttribute,
        TIAttribute extends IAbstractAttribute = IAbstractAttribute
    >(value: IConsumptionAttribute<TIAttribute>): Promise<ConsumptionAttribute<TAttribute>> {
        return (await this.fromAny(value)) as ConsumptionAttribute<TAttribute>
    }

    public static async fromAttribute(
        attribute: IAbstractAttribute,
        succeeds?: ICoreId,
        shareInfo?: IConsumptionAttributeShareInfo
    ): Promise<ConsumptionAttribute> {
        return await this.from({
            content: attribute, // TODO: brauchen wir das nach from Update?
            id: await ConsumptionIds.attribute.generate(),
            createdAt: CoreDate.utc(),
            succeeds: succeeds,
            shareInfo: shareInfo
            // TODO: wie übergeben wir succeeds/succeededBy? Vor allem letzteres wird vermutlich nicht beim create übergeben
        })
    }
}
