import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@nmshd/transport"
import { use } from "chai"
import chaiExclude from "chai-exclude"
import { ConsumptionRequestTest } from "./modules/requests/local/ConsumptionRequest.test"

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

    public static runUnitTests(logger: ILoggerFactory): void {
        new ConsumptionRequestTest(logger).run()
    }
}
