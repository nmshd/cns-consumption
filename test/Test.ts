import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@nmshd/transport"
import { AttributeTest } from "./modules/attributes/Attribute.test"
import { DecideRequestParametersValidatorTests } from "./modules/requests/DecideRequestParamsValidator.test"
import { GenericRequestItemProcessorTests } from "./modules/requests/GenericRequestItemProcessor.test"
import { IncomingRequestControllerTests } from "./modules/requests/IncomingRequestsController.test"
import { CreateAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/createAttribute/CreateAttributeRequestItemProcessor.test"
import { ProposeAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/proposeAttribute/ProposeAttributeRequestItemProcessor.test"
import { ReadAttributeRequestItemProcessorTests } from "./modules/requests/itemProcessors/readAttribute/ReadAttributeRequestItemProcessor.test"
import { ConsumptionRequestTest } from "./modules/requests/local/ConsumptionRequest.test"
import { OutgoingRequestsControllerTests } from "./modules/requests/OutgoingRequestsController.test"
import { RequestEnd2EndTests } from "./modules/requests/RequestEnd2End.test"
import { RequestItemProcessorRegistryTests } from "./modules/requests/RequestItemProcessorRegistry.test"
import setup from "./setup"

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

    private static setupDone = false
    private static doSetup(): void {
        if (this.setupDone) return

        setup()
        this.setupDone = true
    }

    public static runIntegrationTests(
        config: IConfigOverwrite,
        databaseConnection: IDatabaseConnection,
        logger: ILoggerFactory
    ): void {
        this.doSetup()
        new AttributeTest(config, databaseConnection, logger).run()
        new RequestEnd2EndTests(config, databaseConnection, logger).run()
        new OutgoingRequestsControllerTests(config, databaseConnection, logger).run()
        new IncomingRequestControllerTests(config, databaseConnection, logger).run()
        new ReadAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new CreateAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new ProposeAttributeRequestItemProcessorTests(config, databaseConnection, logger).run()
        new RequestItemProcessorRegistryTests(config, databaseConnection, logger).run()
        new GenericRequestItemProcessorTests(config, databaseConnection, logger).run()
    }

    public static runUnitTests(logger: ILoggerFactory): void {
        this.doSetup()
        new ConsumptionRequestTest(logger).run()
        new DecideRequestParametersValidatorTests(logger).run()
    }
}
