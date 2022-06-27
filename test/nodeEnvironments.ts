import { LokiJsConnection } from "@js-soft/docdb-access-loki"
import { MongoDbConnection } from "@js-soft/docdb-access-mongo"
import { NodeLoggerFactory } from "@js-soft/node-logger"
import path from "path"
import { Test } from "./Test"

const loggerFactory = new NodeLoggerFactory({
    appenders: {
        fileAppender: {
            type: "file",
            filename: path.join(
                __dirname,
                "..",
                "log",
                `${new Date()
                    .toISOString()
                    .replace("T", "_")
                    .replace(/\.(\w)*/g, "")
                    .replace(/[:T.Z-]/g, "")}.log`
            ),
            maxLogSize: 10 * 1024 * 1024
        },
        consoleAppender: {
            type: "stdout",
            layout: { type: "pattern", pattern: "%[[%p] %c - %m%]" }
        },
        console: {
            type: "logLevelFilter",
            level: "Warn",
            appender: "consoleAppender"
        },
        file: { type: "logLevelFilter", level: "Trace", appender: "fileAppender" }
    },

    categories: {
        default: {
            appenders: ["file", "console"],
            level: "TRACE"
        }
    }
})

const log = loggerFactory.getLogger("Test")

export function runOnMongoDb(): void {
    if (!process.env["CONNECTION_STRING"]) {
        log.warn("No CONNECTION_STRING defined")
        return
    }

    const mongoDbConnection = new MongoDbConnection(process.env["CONNECTION_STRING"])

    before(async function () {
        await mongoDbConnection.connect()
    })
    after(async function () {
        await mongoDbConnection.close()
    })

    Test.runIntegrationTests(Test.config, mongoDbConnection, loggerFactory)
    Test.runUnitTests(loggerFactory)
}

export function runOnLokiJs(): void {
    Test.runIntegrationTests(Test.config, LokiJsConnection.inMemory(), loggerFactory)
    Test.runUnitTests(loggerFactory)
}
