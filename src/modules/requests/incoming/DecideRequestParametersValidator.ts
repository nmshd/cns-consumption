import { ApplicationError, Result } from "@js-soft/ts-utils"
import { RequestItem, RequestItemGroup } from "@nmshd/content"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { AcceptRequestItemParameters } from "./decide/AcceptRequestItemParameters"
import { AcceptRequestParameters } from "./decide/AcceptRequestParameters"
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

        const isRequestAccepted = params instanceof AcceptRequestParameters

        for (let i = 0; i < params.items.length; i++) {
            const validationResult = this.checkItemOrGroup(
                request.content.items[i],
                params.items[i],
                i.toString(),
                isRequestAccepted
            )
            if (validationResult.isError) return validationResult
        }

        return Result.ok(undefined)
    }

    private checkItemOrGroup(
        requestItem: RequestItem | RequestItemGroup,
        responseItem: DecideRequestItemParameters | DecideRequestItemGroupParameters,
        index: string,
        parentAccepted: boolean
    ): Result<void> {
        if (requestItem instanceof RequestItem) {
            return this.checkItem(requestItem, responseItem, index, parentAccepted)
        }

        return this.checkItemGroup(requestItem, responseItem, index, parentAccepted)
    }

    private checkItem(
        requestItem: RequestItem,
        response: DecideRequestItemParameters | DecideRequestItemGroupParameters,
        index: string,
        parentAccepted: boolean
    ): Result<void> {
        if (response instanceof DecideRequestItemGroupParameters) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItem with index '${index}' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead.`
                )
            )
        }

        if (!parentAccepted && response instanceof AcceptRequestItemParameters) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItem with index '${index}' was answered as an AcceptRequestItemParameters, but the parent was not accepted.`
                )
            )
        }

        if (parentAccepted && requestItem.mustBeAccepted && !(response instanceof AcceptRequestItemParameters)) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItem with index '${index}' that is flagged as required was not accepted. Please use AcceptRequestItemParameters instead.`
                )
            )
        }

        return Result.ok(undefined)
    }

    private checkItemGroup(
        requestItemGroup: RequestItemGroup,
        responseItemGroup: DecideRequestItemParameters | DecideRequestItemGroupParameters,
        index: string,
        parentAccepted: boolean
    ): Result<void> {
        if (responseItemGroup instanceof DecideRequestItemParameters) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItemGroup with index '${index}' was answered as a RequestItem. Please use DecideRequestItemGroupParameters instead.`
                )
            )
        }

        if (responseItemGroup.items.length !== requestItemGroup.items.length) {
            return Result.fail(
                this.invalidNumberOfItemsError("Number of items in RequestItemGroup and ResponseItemGroup do not match")
            )
        }

        for (let i = 0; i < responseItemGroup.items.length; i++) {
            const validationResult = this.checkItem(
                requestItemGroup.items[i],
                responseItemGroup.items[i],
                `${index}.${i}`,
                parentAccepted
            )
            if (validationResult.isError) return validationResult
        }

        return Result.ok(undefined)
    }

    private invalidNumberOfItemsError(message: string) {
        return new ApplicationError("error.requests.decide.validation.invalidNumberOfItems", message)
    }
}
