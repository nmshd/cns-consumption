import { CoreError } from "@nmshd/transport"

class Attributes {
    public attributeExists(id: string) {
        return new CoreError(
            "error.consumption.attributes.attributeExists",
            `Attribute with id '${id}' already exists. Please use succeed instead.`
        )
    }
    public predecessorNotFound(id: string) {
        return new CoreError(
            "error.consumption.attributes.predecessorNotFound",
            `Attribute with id '${id}' does not exist. Please use create instead.`
        )
    }
}

class Requests {
    public requestExists(id: string) {
        return new CoreError(
            "error.consumption.requests.requestExists",
            `Request with id ${id} already exists and can't be created.`
        )
    }

    public unexpectedErrorDuringRequestItemProcessing(error: any) {
        return new CoreError(
            "error.consumption.requests.unexpectedErrorDuringRequestItemProcessing",
            error instanceof Error ? error.message : "Unknown error: '${JSON.stringify(e)'"
        )
    }

    public invalidRequestItem(message: string) {
        return new CoreError("error.consumption.requests.invalidRequestItem", message)
    }
}

class RelationshipInfo {
    public relationshipInfoExists(relationshipId: string) {
        return new CoreError(
            "error.consumption.relationshipInfos.relationshipInfoExists",
            `RelationshipInfo for Relationship ${relationshipId} already exists.`
        )
    }
}

class Onboarding {
    public attributeNotSet(attributeName: string) {
        return new CoreError(
            "error.consumption.onboarding.attributeNotSet",
            `No attribute with name ${attributeName} set but was required to be shared.`
        )
    }

    public wrongTemplate() {
        return new CoreError("error.consumption.onboarding.wrongTemplate", "The given template is in the wrong format.")
    }
}

export class ConsumptionErrors {
    public static attributes = new Attributes()
    public static requests = new Requests()
    public static relationshipInfo = new RelationshipInfo()
    public static onboarding = new Onboarding()
}
