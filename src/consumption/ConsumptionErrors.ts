import { CoreError } from "@nmshd/transport"

class Attributes {
    public attributeExists(name: string) {
        return new CoreError(
            "error.consumption.attributes.attributeExists",
            `Attribute with name ${name} already exists. Please use succeed instead.`
        )
    }
}

class Requests {
    public requestsExists(id: string) {
        return new CoreError(
            "error.consumption.requests.requestExists",
            `Request with id ${id} already exists and can't be created.`
        )
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
