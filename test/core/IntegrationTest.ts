import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions"
import { EventBus, EventEmitter2EventBus } from "@js-soft/ts-utils"
import { IConfigOverwrite } from "@nmshd/transport"

export abstract class IntegrationTest {
    protected logger: ILogger
    protected eventBus: EventBus

    public constructor(
        protected config: IConfigOverwrite,
        protected connection: IDatabaseConnection,
        protected loggerFactory: ILoggerFactory
    ) {
        this.logger = loggerFactory.getLogger(this.constructor.name)
        this.eventBus = new EventEmitter2EventBus(() => {
            // noop
        })
    }

    public abstract run(): void
}
