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
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { AbstractRequestItemProcessor } from "./AbstractRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> extends AbstractRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams> {
    public checkPrerequisitesOfIncomingRequestItem(_requestItem: TRequestItem): Promise<boolean> | boolean {
        return true
    }

    public canAccept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        request: ConsumptionRequest
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public canReject(
        requestItem: TRequestItem,
        params: TRejectParams,
        request: ConsumptionRequest
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public accept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        request: ConsumptionRequest
    ): AcceptResponseItem | Promise<AcceptResponseItem> {
        return AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public reject(
        requestItem: TRequestItem,
        params: TRejectParams,
        request: ConsumptionRequest
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
        request: ConsumptionRequest
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public applyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        request: ConsumptionRequest
    ): Promise<void> | void {
        // do nothing
    }
}
