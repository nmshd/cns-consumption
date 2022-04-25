import {
    AcceptRequestItemParameters,
    GenericRequestItemProcessor,
    RejectRequestItemParameters,
    ValidationResult
} from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem, ResponseItem } from "@nmshd/content"
import { TestRequestItem } from "./TestRequestItem"

export class TestRequestItemProcessor extends GenericRequestItemProcessor<
    TestRequestItem,
    AcceptRequestItemParameters,
    RejectRequestItemParameters
> {
    public static numberOfApplyIncomingResponseItemCalls = 0

    public override canAccept(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtCanAccept) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canReject(
        _requestItem: TestRequestItem,
        _params: AcceptRequestItemParameters
    ): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtCanReject) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canCreateOutgoingRequestItem(_requestItem: TestRequestItem): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtCanCreateOutgoingRequestItem) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canApplyIncomingResponseItem(
        _responseItem: ResponseItem,
        _requestItem: TestRequestItem
    ): Promise<ValidationResult> {
        if (_requestItem.shouldFailAtCanApplyIncomingResponseItem) {
            return Promise.resolve(ValidationResult.error("aCode", "aMessage"))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override applyIncomingResponseItem(
        _responseItem: ResponseItem,
        _requestItem: TestRequestItem
    ): Promise<void> {
        TestRequestItemProcessor.numberOfApplyIncomingResponseItemCalls++
        return Promise.resolve()
    }

    public override checkPrerequisitesOfIncomingRequestItem(_requestItem: TestRequestItem): Promise<boolean> | boolean {
        if (_requestItem.shouldFailAtCheckPrerequisitesOfIncomingRequestItem) {
            return false
        }
        return true
    }

    public override accept(requestItem: TestRequestItem, params: AcceptRequestItemParameters): AcceptResponseItem {
        if (requestItem.shouldThrowOnAccept) {
            throw new Error("Accept failed for testing purposes.")
        }
        return super.accept(requestItem, params)
    }

    public override reject(requestItem: TestRequestItem, params: RejectRequestItemParameters): RejectResponseItem {
        if (requestItem.shouldThrowOnReject) {
            throw new Error("Reject failed for testing purposes.")
        }
        return super.reject(requestItem, params)
    }
}
