import { ApplicationError, Result } from "@js-soft/ts-utils"
import { RequestItem, RequestItemGroup } from "@nmshd/content"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { DecideRequestItemGroupParameters } from "./decide/DecideRequestItemGroupParameters"
import { DecideRequestItemParameters } from "./decide/DecideRequestItemParameters"
import { DecideRequestParameters } from "./decide/DecideRequestParameters"

export class DecideRequestParametersValidator {
    public validate(params: DecideRequestParameters, request: ConsumptionRequest): Result<void> {
        if (!request.id.equals(params.requestId)) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidRequestId",
                    "The id of the request does not match the id of the response"
                )
            )
        }

        if (params.items.length !== request.content.items.length) {
            return Result.fail(this.invalidNumberOfItemsError("Number of items in Request and Response do not match"))
        }

        for (let i = 0; i < params.items.length; i++) {
            const requestItem = request.content.items[i]
            const responseItem = params.items[i]

            if (requestItem instanceof RequestItem) {
                const valid = this.checkResponseForRequestItem(requestItem, responseItem, i)
                if (valid.isError) return valid
            } else if (requestItem instanceof RequestItemGroup) {
                const valid = this.checkResponseForRequestItemGroup(requestItem, responseItem, i)
                if (valid.isError) return valid
            }
        }

        return Result.ok(undefined)
    }

    private checkResponseForRequestItem(
        requestItem: RequestItem,
        response: DecideRequestItemParameters | DecideRequestItemGroupParameters,
        index: number
    ): Result<void> {
        if (response instanceof DecideRequestItemGroupParameters) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItem with index '${index}' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead.`
                )
            )
        }

        return Result.ok(undefined)
    }

    private checkResponseForRequestItemGroup(
        requestItem: RequestItemGroup,
        response: DecideRequestItemParameters | DecideRequestItemGroupParameters,
        index: number
    ): Result<void> {
        if (response instanceof DecideRequestItemParameters) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItemGroup with index '${index}' was answered as a RequestItem. Please use DecideRequestItemGroupParameters instead.`
                )
            )
        }

        if (response.items.length !== requestItem.items.length) {
            return Result.fail(
                this.invalidNumberOfItemsError("Number of items in RequestItemGroup and ResponseItemGroup do not match")
            )
        }

        return Result.ok(undefined)
    }

    private invalidNumberOfItemsError(message: string) {
        return new ApplicationError("error.requests.decide.validation.invalidNumberOfItems", message)
    }
}
