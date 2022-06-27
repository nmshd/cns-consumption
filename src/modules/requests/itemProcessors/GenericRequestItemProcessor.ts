/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    AcceptResponseItem,
    RejectResponseItem,
    Request,
    RequestItem,
    ResponseItem,
    ResponseItemResult
} from "@nmshd/content"
import { CoreAddress } from "@nmshd/transport"
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters"
import { AbstractRequestItemProcessor } from "./AbstractRequestItemProcessor"
import { ConsumptionRequestInfo } from "./IRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> extends AbstractRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams> {
    public checkPrerequisitesOfIncomingRequestItem(
        requestItem: TRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): Promise<boolean> | boolean {
        return true
    }

    public canAccept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        requestInfo: ConsumptionRequestInfo
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public canReject(
        requestItem: TRequestItem,
        params: TRejectParams,
        requestInfo: ConsumptionRequestInfo
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public accept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        requestInfo: ConsumptionRequestInfo
    ): AcceptResponseItem | Promise<AcceptResponseItem> {
        return AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public reject(
        requestItem: TRequestItem,
        params: TRejectParams,
        requestInfo: ConsumptionRequestInfo
    ): RejectResponseItem | Promise<RejectResponseItem> {
        return RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }

    public canCreateOutgoingRequestItem(
        requestItem: TRequestItem,
        request: Request,
        recipient: CoreAddress
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public canApplyIncomingResponseItem(
        responseItem: AcceptResponseItem,
        requestItem: TRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public applyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): Promise<void> | void {
        // do nothing
    }
}
