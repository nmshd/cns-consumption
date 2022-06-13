import { AcceptResponseItem, RejectResponseItem, Request, RequestItem, ResponseItem } from "@nmshd/content"
import { CoreAddress } from "@nmshd/transport"
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { ValidationResult } from "./ValidationResult"

export interface IRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> {
    checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem): Promise<boolean> | boolean
    canAccept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        request: ConsumptionRequest
    ): Promise<ValidationResult> | ValidationResult
    canReject(
        requestItem: TRequestItem,
        params: TRejectParams,
        request: ConsumptionRequest
    ): Promise<ValidationResult> | ValidationResult
    accept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        request: ConsumptionRequest
    ): Promise<AcceptResponseItem> | AcceptResponseItem
    reject(
        requestItem: TRequestItem,
        params: TRejectParams,
        request: ConsumptionRequest
    ): Promise<RejectResponseItem> | RejectResponseItem

    canCreateOutgoingRequestItem(
        requestItem: TRequestItem,
        request: Request,
        recipient: CoreAddress
    ): Promise<ValidationResult> | ValidationResult
    canApplyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        request: ConsumptionRequest
    ): Promise<ValidationResult> | ValidationResult
    applyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        request: ConsumptionRequest
    ): Promise<void> | void
}
