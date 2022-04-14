import { serialize, type, validate } from "@js-soft/ts-serval"
import { IRequestItem, RequestItem } from "@nmshd/content"

export interface ITestRequestItem extends IRequestItem {
    shouldFailAtCanAccept?: true
    shouldFailAtCanReject?: true
    shouldFailAtCanCreateOutgoingRequestItem?: true
    shouldFailAtCanApplyIncomingResponseItem?: true
}

@type("TestRequestItem")
export class TestRequestItem extends RequestItem implements ITestRequestItem {
    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanAccept?: true

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanReject?: true

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanCreateOutgoingRequestItem?: true

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCanApplyIncomingResponseItem?: true

    @serialize()
    @validate({ nullable: true })
    public shouldFailAtCheckPrerequisitesOfIncomingRequestItem?: true

    public static override async from(item: ITestRequestItem): Promise<TestRequestItem> {
        return await super.fromT(item, TestRequestItem)
    }
}
