import { ApplicationError } from "@js-soft/ts-utils"
import { RequestItem, RequestItemGroup } from "@nmshd/content"
import { CoreId } from "@nmshd/transport"
import { ValidationResult } from "../itemProcessors/ValidationResult"
import { LocalRequest } from "../local/LocalRequest"
import {
    DecideRequestItemGroupParametersJSON,
    isDecideRequestItemGroupParametersJSON
} from "./decide/DecideRequestItemGroupParameters"
import {
    DecideRequestItemParametersJSON,
    isDecideRequestItemParametersJSON
} from "./decide/DecideRequestItemParameters"
import { InternalDecideRequestParametersJSON } from "./decide/InternalDecideRequestParameters"

export class DecideRequestParametersValidator {
    public validate(params: InternalDecideRequestParametersJSON, request: LocalRequest): ValidationResult {
        if (!request.id.equals(CoreId.from(params.requestId))) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidRequestId",
                    "The id of the request does not match the id of the response"
                )
            )
        }

        if (params.items.length !== request.content.items.length) {
            return ValidationResult.error(
                this.invalidNumberOfItemsError("Number of items in Request and Response do not match")
            )
        }

        const validationResults = request.content.items.map((requestItem, index) =>
            this.checkItemOrGroup(requestItem, params.items[index], params.accept)
        )
        return ValidationResult.fromItems(validationResults)
    }

    private checkItemOrGroup(
        requestItem: RequestItem | RequestItemGroup,
        responseItem: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        isParentAccepted: boolean
    ): ValidationResult {
        if (requestItem instanceof RequestItem) {
            return this.checkItem(requestItem, responseItem, isParentAccepted)
        }

        return this.checkItemGroup(requestItem, responseItem, isParentAccepted)
    }

    private checkItem(
        requestItem: RequestItem,
        response: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        isParentAccepted: boolean
    ): ValidationResult {
        if (isDecideRequestItemGroupParametersJSON(response)) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    "The RequestItem was answered as a RequestItemGroup."
                )
            )
        }

        if (!isParentAccepted && response.accept) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    "The RequestItem was accepted, but the parent was not accepted."
                )
            )
        }

        if (isParentAccepted && requestItem.mustBeAccepted && !response.accept) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    "The RequestItem is flagged as 'mustBeAccepted', was not accepted."
                )
            )
        }

        return ValidationResult.success()
    }

    private checkItemGroup(
        requestItemGroup: RequestItemGroup,
        responseItemGroup: DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON,
        isParentAccepted: boolean
    ): ValidationResult {
        if (isDecideRequestItemParametersJSON(responseItemGroup)) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    "The RequestItemGroup was answered as a RequestItem."
                )
            )
        }

        if (responseItemGroup.items.length !== requestItemGroup.items.length) {
            return ValidationResult.error(
                this.invalidNumberOfItemsError("Number of items in RequestItemGroup and ResponseItemGroup do not match")
            )
        }

        const isGroupAccepted = responseItemGroup.items.some((value) => value.accept)

        if (!isParentAccepted && isGroupAccepted) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    "The RequestItemGroup was accepted, but the parent was not accepted."
                )
            )
        }

        if (isParentAccepted && requestItemGroup.mustBeAccepted && !isGroupAccepted) {
            return ValidationResult.error(
                new ApplicationError(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem",
                    "The RequestItemGroup is flagged as 'mustBeAccepted', was not accepted. Please accept all 'mustBeAccepted' items in this group."
                )
            )
        }

        const validationResults = requestItemGroup.items.map((requestItem, index) =>
            this.checkItem(requestItem, responseItemGroup.items[index], isGroupAccepted)
        )
        return ValidationResult.fromItems(validationResults)
    }

    private invalidNumberOfItemsError(message: string) {
        return new ApplicationError("error.requests.decide.validation.invalidNumberOfItems", message)
    }
}
