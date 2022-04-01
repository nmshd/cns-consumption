import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@nmshd/transport"
import { use } from "chai"
import chaiExclude from "chai-exclude"
import { DecideRequestParametersValidatorTests } from "./modules/requests/DecideRequestParamsValidator.test"
import { IncomingRequestControllerTests } from "./modules/requests/IncomingRequestsController.test"
import { ConsumptionRequestTest } from "./modules/requests/local/ConsumptionRequest.test"
import { OutgoingRequestControllerTests } from "./modules/requests/OutgoingRequestsController.test"
import { RequestItemProcessorTests } from "./modules/requests/RequestItemProcessor.test"
import { RequestItemProcessorRegistryTests } from "./modules/requests/RequestItemProcessorRegistry.test"

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
        // new RelationshipInfoOldTemplateTest(config, databaseConnection, logger).run()
        // new RelationshipInfoNoTemplateTest(config, databaseConnection, logger).run()
        // new AttributeTest(config, databaseConnection, logger).run()
        // new RelationshipInfoTest(config, databaseConnection, logger).run()
        // new RelationshipRequestorTest(config, databaseConnection, logger).run()
        new OutgoingRequestControllerTests(config, databaseConnection, logger).run()
        new IncomingRequestControllerTests(config, databaseConnection, logger).run()
        new RequestItemProcessorRegistryTests(config, databaseConnection, logger).run()
        new RequestItemProcessorTests(config, databaseConnection, logger).run()
    }

    public static runUnitTests(logger: ILoggerFactory): void {
        new ConsumptionRequestTest(logger).run()
        new DecideRequestParametersValidatorTests(logger).run()
    }
}
