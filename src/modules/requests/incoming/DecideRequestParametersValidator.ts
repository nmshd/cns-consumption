import { ApplicationError, Result } from "@js-soft/ts-utils"
import { RequestItem, RequestItemGroup } from "@nmshd/content"
import { CoreId } from "@nmshd/transport"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import {
    DecideRequestItemGroupParametersJSON,
    isDecideRequestItemGroupParametersJSON
} from "./decide/DecideRequestItemGroupParameters"
import {
    DecideRequestItemParametersJSON,
    isDecideRequestItemParametersJSON
} from "./decide/DecideRequestItemParameters"
import { InternalDecideRequestParametersJSON, RequestDecision } from "./decide/InternalDecideRequestParameters"
import { RequestItemDecision } from "./decide/RequestItemDecision"

export class DecideRequestParametersValidator {
    public validate(params: InternalDecideRequestParametersJSON, request: ConsumptionRequest): Result<void> {
        if (!request.id.equals(CoreId.from(params.requestId))) {
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

        const isRequestAccepted = params.decision === RequestDecision.Accept

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
        responseItem: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
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
        response: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        index: string,
        parentAccepted: boolean
    ): Result<void> {
        if (isDecideRequestItemGroupParametersJSON(response)) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItem with index '${index}' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead.`
                )
            )
        }

        if (!parentAccepted && response.decision === RequestItemDecision.Accept) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItem with index '${index}' was answered as an AcceptRequestItemParameters, but the parent was not accepted.`
                )
            )
        }

        if (parentAccepted && requestItem.mustBeAccepted && response.decision === RequestItemDecision.Reject) {
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
        responseItemGroup: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        index: string,
        parentAccepted: boolean
    ): Result<void> {
        if (isDecideRequestItemParametersJSON(responseItemGroup)) {
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

        const isGroupAccepted = responseItemGroup.items.some((value) => value.decision === RequestItemDecision.Accept)

        if (!parentAccepted && isGroupAccepted) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItemGroup with index '${index}' was accepted, but the parent was not accepted.`
                )
            )
        }

        if (parentAccepted && requestItemGroup.mustBeAccepted && !isGroupAccepted) {
            return Result.fail(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    `The RequestItemGroup with index '${index}' that is flagged as required was not accepted. Please accept all required items in this group.`
                )
            )
        }

        for (let i = 0; i < responseItemGroup.items.length; i++) {
            const validationResult = this.checkItem(
                requestItemGroup.items[i],
                responseItemGroup.items[i],
                `${index}.${i}`,
                isGroupAccepted
            )
            if (validationResult.isError) return validationResult
        }

        return Result.ok(undefined)
    }

    private invalidNumberOfItemsError(message: string) {
        return new ApplicationError("error.requests.decide.validation.invalidNumberOfItems", message)
    }
}
