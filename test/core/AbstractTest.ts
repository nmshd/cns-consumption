import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions"
import { IConfigOverwrite } from "@nmshd/transport"

export abstract class AbstractTest {
    protected logger: ILogger

    public constructor(
        protected config: IConfigOverwrite,
        protected connection: IDatabaseConnection,
        protected loggerFactory: ILoggerFactory
    ) {
        this.logger = loggerFactory.getLogger(this.constructor.name)
    }

    public abstract run(): void
}
