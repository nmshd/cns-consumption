import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem, ResponseItemResult } from "@nmshd/content"
import { AcceptRequestItemParameters } from "../completeRequestParameters/AcceptRequestItemParameters"
import { CompleteRequestItemParameters } from "../completeRequestParameters/CompleteRequestItemParameters"
import { RejectRequestItemParameters } from "../completeRequestParameters/RejectRequestItemParameters"

export class RequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> {
    public async accept(requestItem: TRequestItem, _params: TAcceptParams): Promise<ResponseItem> {
        return await AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public async reject(requestItem: TRequestItem, _params: TRejectParams): Promise<ResponseItem> {
        return await RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }

    public async complete(requestItem: TRequestItem, params: CompleteRequestItemParameters): Promise<ResponseItem> {
        if (params instanceof AcceptRequestItemParameters) {
            return await this.accept(requestItem, params as TAcceptParams)
        } else if (params instanceof RejectRequestItemParameters) {
            return await this.reject(requestItem, params as TRejectParams)
        }

        throw new Error("Unknown params type")
    }
}
