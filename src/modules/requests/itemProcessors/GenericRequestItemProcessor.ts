import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItemResult } from "@nmshd/content"
import { AcceptRequestItemParameters } from "../incoming/decideRequestParameters/AcceptRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decideRequestParameters/RejectRequestItemParameters"
import { IRequestItemProcessor } from "./IRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> implements IRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams>
{
    public canAccept(_requestItem: TRequestItem, _params: TAcceptParams): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.success())
    }

    public canReject(_requestItem: TRequestItem, _params: TRejectParams): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.success())
    }

    public async accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem> {
        const canAcceptResult = await this.canAccept(requestItem, params)

        if (canAcceptResult.isError()) {
            throw new Error(canAcceptResult.code + canAcceptResult.message)
        }
        return await AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public async reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem> {
        const canRejectResult = await this.canReject(requestItem, params)

        if (canRejectResult.isError()) {
            throw new Error(canRejectResult.code + canRejectResult.message)
        }

        return await RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }
}
