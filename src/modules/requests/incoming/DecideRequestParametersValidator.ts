import { ApplicationError, Result } from "@js-soft/ts-utils"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { IDecideRequestParameters } from "./decideRequestParameters/DecideRequestParameters"

export class DecideRequestParametersValidator {
    public validate(params: IDecideRequestParameters, request: ConsumptionRequest): Result<undefined> {
        if (params.items.length !== request.content.items.length) {
            return Result.fail(new ApplicationError("", "Number of items in Request and Response do not match"))
        }
        return Result.ok(undefined)
    }
}
