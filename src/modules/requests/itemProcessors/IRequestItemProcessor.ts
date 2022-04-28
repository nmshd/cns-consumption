import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem } from "@nmshd/content"
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters"
import { ValidationResult } from "./ValidationResult"

export interface IRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> {
    checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem): Promise<boolean> | boolean
    canAccept(requestItem: TRequestItem, params: TAcceptParams): Promise<ValidationResult> | ValidationResult
    canReject(requestItem: TRequestItem, params: TRejectParams): Promise<ValidationResult> | ValidationResult
    accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem> | AcceptResponseItem
    reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem> | RejectResponseItem

    canCreateOutgoingRequestItem(requestItem: TRequestItem): Promise<ValidationResult> | ValidationResult
    canApplyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem
    ): Promise<ValidationResult> | ValidationResult
    applyIncomingResponseItem(responseItem: ResponseItem, requestItem: TRequestItem): Promise<void> | void
}
