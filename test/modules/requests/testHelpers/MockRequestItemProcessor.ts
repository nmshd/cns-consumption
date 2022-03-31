import { AcceptRequestItemParameters, RejectRequestItemParameters, RequestItemProcessor } from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem, RequestItem } from "@nmshd/content"
import { TestRequestItem } from "./TestRequestItem"

export class MockRequestItemProcessor extends RequestItemProcessor<TestRequestItem> {
    public numberOfAcceptCalls = 0
    public numberOfRejectCalls = 0

    public async accept(requestItem: RequestItem, params: AcceptRequestItemParameters): Promise<AcceptResponseItem> {
        this.numberOfAcceptCalls++

        return await super.accept(requestItem, params)
    }

    public async reject(requestItem: RequestItem, params: RejectRequestItemParameters): Promise<RejectResponseItem> {
        this.numberOfRejectCalls++

        return await super.reject(requestItem, params)
    }
}
