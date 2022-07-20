import { TransportDataEvent } from "@nmshd/transport"
import { LocalAttribute } from "../local/LocalAttribute"

export class AttributeSucceededEvent extends TransportDataEvent<LocalAttribute> {
    public static readonly namespace = "consumption.attributeSucceded"

    public constructor(eventTargetAddress: string, data: LocalAttribute) {
        super(AttributeSucceededEvent.namespace, eventTargetAddress, data)
    }
}
