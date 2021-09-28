import { LokiJsConnection } from "@js-soft/docdb-access-loki"
import { WebLoggerFactory } from "@js-soft/web-logger"
import { Transport, TransportContext } from "@nmshd/transport"
import { BackboneEnvironment, Test } from "./Test"

const config = Test.config

if (Transport.context === TransportContext.Web) {
    switch (config.baseUrl) {
        case BackboneEnvironment.Local:
            config.baseUrl = "/svc-local"
            break
        case BackboneEnvironment.Dev:
            config.baseUrl = "/svc-dev"
            break
        case BackboneEnvironment.Stage:
            config.baseUrl = "/svc-stage"
            break
        case BackboneEnvironment.Prod:
            config.baseUrl = "/svc-prod"
            break
        default:
            throw new Error(`${config.baseUrl} is not a valid value for 'config.baseUrl'`)
    }
}

Test.runIntegrationTests(config, new LokiJsConnection("./db"), new WebLoggerFactory())
