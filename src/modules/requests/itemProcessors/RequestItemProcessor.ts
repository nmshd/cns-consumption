import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem, ResponseItemResult } from "@nmshd/content"
import { AcceptRequestItemParameters } from "../incoming/decideRequestParameters/AcceptRequestItemParameters"
import { DecideRequestItemParameters } from "../incoming/decideRequestParameters/DecideRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decideRequestParameters/RejectRequestItemParameters"

export class RequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> {
    public async accept(requestItem: TRequestItem, _params: TAcceptParams): Promise<AcceptResponseItem> {
        return await AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public async reject(requestItem: TRequestItem, _params: TRejectParams): Promise<RejectResponseItem> {
        return await RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }

    public async processDecision(
        requestItem: TRequestItem,
        params: DecideRequestItemParameters
    ): Promise<ResponseItem> {
        if (params instanceof AcceptRequestItemParameters) {
            return await this.accept(requestItem, params as TAcceptParams)
        } else if (params instanceof RejectRequestItemParameters) {
            return await this.reject(requestItem, params as TRejectParams)
        }

        throw new Error("Unknown params type")
    }
}
