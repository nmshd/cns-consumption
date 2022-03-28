import { AcceptRequestItemParameters, RejectRequestItemParameters, RequestItemProcessor } from "@nmshd/consumption"
import { RequestItem, ResponseItem } from "@nmshd/content"
import { TestRequestItem } from "./TestRequestItem"

export class MockRequestItemProcessor extends RequestItemProcessor<TestRequestItem> {
    public numberOfAcceptCalls = 0
    public numberOfRejectCalls = 0

    public async accept(requestItem: RequestItem, params: AcceptRequestItemParameters): Promise<ResponseItem> {
        this.numberOfAcceptCalls++

        return await super.accept(requestItem, params)
    }

    public async reject(requestItem: RequestItem, params: RejectRequestItemParameters): Promise<ResponseItem> {
        this.numberOfRejectCalls++

        return await super.reject(requestItem, params)
    }
}
