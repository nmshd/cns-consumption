import { AcceptResponseItem, RejectResponseItem, RequestItem } from "@nmshd/content"
import { TestRequestItem } from "../../../../test/modules/requests/testHelpers/TestRequestItem"
import { AcceptRequestItemParameters } from "../incoming/decideRequestParameters/AcceptRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decideRequestParameters/RejectRequestItemParameters"
import { ValidationResult } from "./ValidationResult"

export interface IRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> {
    checkPrerequisitesOfIncomingRequestItem(_requestItem: TestRequestItem): Promise<boolean>
    canAccept(requestItem: TRequestItem, params: TAcceptParams): Promise<ValidationResult>
    canReject(requestItem: TRequestItem, params: TRejectParams): Promise<ValidationResult>
    accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem>
    reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem>

    validateOutgoingRequestItem(_requestItem: TestRequestItem): Promise<ValidationResult>
    validateIncomingResponseItem(_responseItem: AcceptResponseItem, _requestItem: TRequestItem): Promise<boolean>
    applyIncomingResponseItem(_responseItem: AcceptResponseItem, _requestItem: TestRequestItem): Promise<void>
}
