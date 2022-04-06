import {
    AcceptRequestItemParameters,
    GenericRequestItemProcessor,
    RejectRequestItemParameters,
    ValidationResult
} from "@nmshd/consumption"
import { ResponseItem } from "@nmshd/content"
import { TestRequestItem } from "./TestRequestItem"

export class TestRequestItemProcessor extends GenericRequestItemProcessor<
    TestRequestItem,
    AcceptRequestItemParameters,
    RejectRequestItemParameters
> {
    public override canAccept(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtValidation) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canReject(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtValidation) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canCreateOutgoingRequestItem(_requestItem: TestRequestItem): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtValidation) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override validateIncomingResponseItem(
        _responseItem: ResponseItem,
        _requestItem: TestRequestItem
    ): Promise<boolean> {
        if (_requestItem.shouldFailAtValidation) {
            return Promise.resolve(false)
        }
        return Promise.resolve(true)
    }
}
