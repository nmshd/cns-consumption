import { ILogger, ILoggerFactory } from "@js-soft/logging-abstractions"

export abstract class UnitTest {
    protected logger: ILogger

    public constructor(protected loggerFactory: ILoggerFactory) {
        this.logger = loggerFactory.getLogger(this.constructor.name)
    }

    public abstract run(): void
}
