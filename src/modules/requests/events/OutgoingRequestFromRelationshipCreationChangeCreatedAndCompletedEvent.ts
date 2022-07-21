import { TransportDataEvent } from "@nmshd/transport"
import { LocalRequest } from "../.."

export class OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent extends TransportDataEvent<LocalRequest> {
    public static readonly namespace = "consumption.outgoingRequestFromRelationshipCreationChangeCreatedAndCompleted"

    public constructor(eventTargetAddress: string, data: LocalRequest) {
        super(OutgoingRequestFromRelationshipCreationChangeCreatedAndCompletedEvent.namespace, eventTargetAddress, data)

        if (!data.isOwn) throw new Error("Cannot create this event for an incoming Request")
    }
}
