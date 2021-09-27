import { ILogger } from "@js-soft/logging-abstractions"
import { Serializable, SerializableAsync } from "@js-soft/ts-serval"
import { TransportErrors, TransportLoggerFactory } from "@nmshd/transport"
import { ConsumptionController } from "./ConsumptionController"
import { ConsumptionControllerName } from "./ConsumptionControllerName"

export class ConsumptionBaseController {
    protected _log: ILogger
    public get log(): ILogger {
        return this._log
    }

    public get parent(): ConsumptionController {
        return this._parent
    }

    public constructor(controllerName: ConsumptionControllerName, protected _parent: ConsumptionController) {
        this._log = TransportLoggerFactory.getLogger(controllerName)
    }

    public init(): Promise<ConsumptionBaseController> {
        return Promise.resolve(this)
    }

    protected async parseObject<T extends SerializableAsync | Serializable>(
        value: Object,
        type: new () => T
    ): Promise<T> {
        return await SerializableAsync.fromT<T>(value, type)
    }

    protected async parseArray<T extends SerializableAsync | Serializable>(
        value: Object[],
        type: new () => T,
        contentProperty?: string
    ): Promise<T[]> {
        const parsingPromises: Promise<T>[] = []
        for (let i = 0, l = value.length; i < l; i++) {
            if (contentProperty) {
                const item: any = value[i]
                if (item[contentProperty]) {
                    parsingPromises.push(this.parseObject(item[contentProperty], type))
                } else {
                    const error = TransportErrors.controller.contentPropertyUndefined(contentProperty)
                    this._log.error(error)
                    throw error
                }
            } else {
                parsingPromises.push(this.parseObject(value[i], type))
            }
        }
        return await Promise.all(parsingPromises)
    }
}
