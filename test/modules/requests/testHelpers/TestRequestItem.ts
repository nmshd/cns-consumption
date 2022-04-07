import { serialize, type, validate } from "@js-soft/ts-serval"
import { IRequestItem, RequestItem } from "@nmshd/content"

export interface ITestRequestItem extends IRequestItem {
    shouldFailAtValidation?: true
}

@type("TestRequestItem")
export class TestRequestItem extends RequestItem implements ITestRequestItem {
    @serialize()
    @validate({ nullable: true })
    public shouldFailAtValidation?: true

    public static override async from(item: ITestRequestItem): Promise<TestRequestItem> {
        return await super.fromT(item, TestRequestItem)
    }
}
