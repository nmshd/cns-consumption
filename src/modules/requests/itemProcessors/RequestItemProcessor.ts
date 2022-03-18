import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem, ResponseItemResult } from "@nmshd/content"
import {
    AcceptRequestItemParams,
    CompleteRequestItemParams,
    RejectRequestItemParams,
    RequestItemDecision
} from "../../.."

export class RequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParams = AcceptRequestItemParams,
    TRejectParams extends RejectRequestItemParams = RejectRequestItemParams
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

    public async complete(requestItem: TRequestItem, params: CompleteRequestItemParams): Promise<ResponseItem> {
        switch (params.decision) {
            case RequestItemDecision.Accept:
                return await this.accept(requestItem, params as TAcceptParams)
            case RequestItemDecision.Reject:
                return await this.reject(requestItem, params as TRejectParams)
        }
    }
}
