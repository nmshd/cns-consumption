import { TransportDataEvent } from "@nmshd/transport"
import { LocalRequest } from "../.."

export class IncomingRequestReceivedEvent extends TransportDataEvent<LocalRequest> {
    public static readonly namespace = "consumption.incomingRequestReceived"

    public constructor(eventTargetAddress: string, data: LocalRequest) {
        super(IncomingRequestReceivedEvent.namespace, eventTargetAddress, data)

        if (data.isOwn) throw new Error("Cannot create this event for an outgoing Request")
    }
}
