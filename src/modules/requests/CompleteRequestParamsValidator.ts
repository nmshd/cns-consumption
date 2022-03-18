import { ApplicationError, Result } from "@js-soft/ts-utils"
import { CompleteRequestParams } from "./CompleteRequestParams"
import { ConsumptionRequest } from "./local/ConsumptionRequest"

export class CompleteRequestParamsValidator {
    public validate(params: CompleteRequestParams, request: ConsumptionRequest): Result<undefined> {
        if (params.items.length !== request.content.items.length) {
            return Result.fail(new ApplicationError("", "Number of items in Request and Response do not match"))
        }
        return Result.ok(undefined)
    }
}
