import { ApplicationError, Result } from "@js-soft/ts-utils"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { InternalDecideRequestParametersJSON } from "./decide/InternalDecideRequestParameters"

export class DecideRequestParametersValidator {
    public validate(params: InternalDecideRequestParametersJSON, request: ConsumptionRequest): Result<undefined> {
        if (params.items.length !== request.content.items.length) {
            return Result.fail(
                new ApplicationError("invalidNumberOfItems", "Number of items in Request and Response do not match")
            )
        }
        return Result.ok(undefined)
    }
}
