import { type } from "@js-soft/ts-serval"
import { IRequestItem, RequestItem } from "@nmshd/content"

export interface ITestRequestItem extends IRequestItem {}

@type("TestRequestItem")
export class TestRequestItem extends RequestItem implements ITestRequestItem {
    public static async from(item: ITestRequestItem): Promise<TestRequestItem> {
        return await super.fromT(item, TestRequestItem)
    }
}
