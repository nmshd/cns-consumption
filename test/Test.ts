import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@nmshd/transport"
import { AttributeTest } from "./modules/attributes/Attribute.test"
import { RelationshipInfoTest } from "./modules/relationships/RelationshipInfo.test"
import { RelationshipInfoNoTemplateTest } from "./modules/relationships/RelationshipInfoNoTemplate.test"
import { RelationshipInfoOldTemplateTest } from "./modules/relationships/RelationshipInfoOldTemplate.test"
import { RelationshipRequestorTest } from "./modules/relationships/RelationshipRequestor.test"

export enum BackboneEnvironment {
    Local = "http://enmeshed.local",
    Dev = "http://dev.enmeshed.eu", // !!leave http here!!
    Stage = "https://stage.enmeshed.eu",
    Prod = "https://prod.enmeshed.eu"
}

export class Test {
    public static readonly currentEnvironment = BackboneEnvironment.Stage
    public static readonly config: IConfigOverwrite = {
        baseUrl: Test.currentEnvironment,
        debug: true,
        platformClientId: "test",
        platformClientSecret: "a6owPRo8c98Ue8Z6mHoNgg5viF5teD"
    }

    public static runIntegrationTests(
        config: IConfigOverwrite,
        databaseConnection: IDatabaseConnection,
        logger: ILoggerFactory
    ): void {
        new RelationshipInfoOldTemplateTest(config, databaseConnection, logger).run()
        new RelationshipInfoNoTemplateTest(config, databaseConnection, logger).run()
        new AttributeTest(config, databaseConnection, logger).run()
        new RelationshipInfoTest(config, databaseConnection, logger).run()
        new RelationshipRequestorTest(config, databaseConnection, logger).run()
    }
}
