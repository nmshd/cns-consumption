import { AcceptResponseItem, RejectResponseItem, RequestItem } from "@nmshd/content"
import { AcceptRequestItemParameters } from "../incoming/decideRequestParameters/AcceptRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decideRequestParameters/RejectRequestItemParameters"
import { DecideRequestValidationResult } from "./GenericRequestItemProcessor"

export interface IRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> {
    canAccept(requestItem: TRequestItem, params: TAcceptParams): Promise<DecideRequestValidationResult>
    canReject(requestItem: TRequestItem, params: TRejectParams): Promise<DecideRequestValidationResult>
    accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem>
    reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem>
}
