import { AcceptRequestItemParams, RejectRequestItemParams, RequestItemProcessor } from "@nmshd/consumption"
import { RequestItem, ResponseItem } from "@nmshd/content"
import { TestRequestItem } from "./TestRequestItem"

export class MockRequestItemProcessor extends RequestItemProcessor<TestRequestItem> {
    public numberOfAcceptCalls = 0
    public numberOfRejectCalls = 0

    public async accept(requestItem: RequestItem, params: AcceptRequestItemParams): Promise<ResponseItem> {
        this.numberOfAcceptCalls++

        return await super.accept(requestItem, params)
    }

    public async reject(requestItem: RequestItem, params: RejectRequestItemParams): Promise<ResponseItem> {
        this.numberOfRejectCalls++

        return await super.reject(requestItem, params)
    }
}
