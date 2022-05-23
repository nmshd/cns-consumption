import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem, ResponseItemResult } from "@nmshd/content"
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters"
import { IRequestItemProcessor } from "./IRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> extends AbstractRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams> {
    public checkPrerequisitesOfIncomingRequestItem(_requestItem: TRequestItem): Promise<boolean> | boolean {
        return true
    }

    public canAccept(_requestItem: TRequestItem, _params: TAcceptParams): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public canReject(_requestItem: TRequestItem, _params: TRejectParams): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public accept(requestItem: TRequestItem, _params: TAcceptParams): AcceptResponseItem {
        return AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public reject(requestItem: TRequestItem, _params: TRejectParams): RejectResponseItem {
        return RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }

    public canApplyIncomingResponseItem(
        _responseItem: AcceptResponseItem,
        _requestItem: TRequestItem
    ): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public canCreateOutgoingRequestItem(_requestItem: TRequestItem): Promise<ValidationResult> | ValidationResult {
        return ValidationResult.success()
    }

    public applyIncomingResponseItem(_responseItem: ResponseItem, _requestItem: TRequestItem): Promise<void> | void {
        // do nothing
    }
}
