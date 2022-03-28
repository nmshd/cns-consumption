import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@nmshd/transport"
import { use } from "chai"
import chaiExclude from "chai-exclude"
import { AttributeTest } from "./modules/attributes/Attribute.test"
import { RelationshipInfoTest } from "./modules/relationships/RelationshipInfo.test"
import { RelationshipInfoNoTemplateTest } from "./modules/relationships/RelationshipInfoNoTemplate.test"
import { RelationshipInfoOldTemplateTest } from "./modules/relationships/RelationshipInfoOldTemplate.test"
import { RelationshipRequestorTest } from "./modules/relationships/RelationshipRequestor.test"
import { CompleteRequestParamsValidatorTests } from "./modules/requests/CompleteRequestParamsValidator.test"
// import { AttributeTest } from "./modules/attributes/Attribute.test"
// import { RelationshipInfoTest } from "./modules/relationships/RelationshipInfo.test"
// import { RelationshipInfoNoTemplateTest } from "./modules/relationships/RelationshipInfoNoTemplate.test"
// import { RelationshipInfoOldTemplateTest } from "./modules/relationships/RelationshipInfoOldTemplate.test"
// import { RelationshipRequestorTest } from "./modules/relationships/RelationshipRequestor.test"
import { ConsumptionRequestTest } from "./modules/requests/local/ConsumptionRequest.test"
import { RequestItemProcessorTests } from "./modules/requests/RequestItemProcessor.test"
import { RequestItemProcessorRegistryTests } from "./modules/requests/RequestItemProcessorRegistry.test"
import { RequestControllerTests } from "./modules/requests/RequestsController.test"

use(chaiExclude)

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
        new RequestControllerTests(config, databaseConnection, logger).run()
        new RequestItemProcessorRegistryTests(config, databaseConnection, logger).run()
        new RequestItemProcessorTests(config, databaseConnection, logger).run()
    }

    public static runUnitTests(logger: ILoggerFactory): void {
        new ConsumptionRequestTest(logger).run()
        new CompleteRequestParamsValidatorTests(logger).run()
    }
}
