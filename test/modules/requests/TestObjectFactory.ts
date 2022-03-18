import { type } from "@js-soft/ts-serval"
import { RequestItem, RequestJSON, ResponseItemResult, ResponseJSON } from "@nmshd/content"

@type("TestRequestItem")
export class TestRequestItem extends RequestItem {}

export class TestObjectFactory {
    public static createRequest(): RequestJSON {
        return {
            "@type": "Request",
            items: [
                {
                    "@type": "TestRequestItem",
                    mustBeAccepted: true
                }
            ]
        }
    }

    public static createResponse(): ResponseJSON {
        return {
            "@type": "Response",
            requestId: "CNSREQ1",
            items: [
                {
                    "@type": "ResponseItem",
                    result: ResponseItemResult.Accepted
                }
            ]
        }
    }
}
