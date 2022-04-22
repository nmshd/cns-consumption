import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem } from "@nmshd/content"
import { AcceptRequestItemParameters } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decide/RejectRequestItemParameters"
import { ValidationResult } from "./ValidationResult"

export interface IRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> {
    checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem): Promise<boolean> | boolean
    canAccept(requestItem: TRequestItem, params: TAcceptParams): Promise<ValidationResult> | ValidationResult
    canReject(requestItem: TRequestItem, params: TRejectParams): Promise<ValidationResult> | ValidationResult
    accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem>
    reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem>

    canCreateOutgoingRequestItem(requestItem: TRequestItem): Promise<ValidationResult> | ValidationResult
    canApplyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem
    ): Promise<ValidationResult> | ValidationResult
    applyIncomingResponseItem(responseItem: ResponseItem, requestItem: TRequestItem): Promise<void> | void
}
