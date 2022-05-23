import { ApplicationError } from "@js-soft/ts-utils"
import {
    AcceptRequestItemParametersJSON,
    ConsumptionRequest,
    GenericRequestItemProcessor,
    RejectRequestItemParametersJSON,
    ValidationResult
} from "@nmshd/consumption"
import { AcceptResponseItem, RejectResponseItem, ResponseItem } from "@nmshd/content"
import { TestRequestItem } from "./TestRequestItem"

export class TestRequestItemProcessor extends GenericRequestItemProcessor<TestRequestItem> {
    public static numberOfApplyIncomingResponseItemCalls = 0

    public override canAccept(requestItem: TestRequestItem): Promise<ValidationResult> {
        if (requestItem.shouldFailAtCanAccept) {
            return Promise.resolve(ValidationResult.error(new ApplicationError("aCode", "aMessage")))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canReject(requestItem: TestRequestItem): Promise<ValidationResult> {
        if (requestItem.shouldFailAtCanReject) {
            return Promise.resolve(ValidationResult.error(new ApplicationError("aCode", "aMessage")))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canCreateOutgoingRequestItem(requestItem: TestRequestItem): Promise<ValidationResult> {
        if (requestItem.shouldFailAtCanCreateOutgoingRequestItem) {
            return Promise.resolve(ValidationResult.error(new ApplicationError("aCode", "aMessage")))
        }
        return Promise.resolve(ValidationResult.success())
    }

    public override canApplyIncomingResponseItem(
        _responseItem: ResponseItem,
        requestItem: TestRequestItem
    ): Promise<ValidationResult> {
        if (requestItem.shouldFailAtCanApplyIncomingResponseItem) {
            return Promise.resolve(ValidationResult.error(new ApplicationError("aCode", "aMessage")))
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

    public override checkPrerequisitesOfIncomingRequestItem(requestItem: TestRequestItem): Promise<boolean> | boolean {
        if (requestItem.shouldFailAtCheckPrerequisitesOfIncomingRequestItem) {
            return false
        }
        return true
    }

    public override accept(
        requestItem: TestRequestItem,
        params: AcceptRequestItemParametersJSON,
        request: ConsumptionRequest
    ): AcceptResponseItem | Promise<AcceptResponseItem> {
        if (requestItem.shouldThrowOnAccept) {
            throw new Error("Accept failed for testing purposes.")
        }
        return super.accept(requestItem, params, request)
    }

    public override reject(
        requestItem: TestRequestItem,
        params: RejectRequestItemParametersJSON,
        request: ConsumptionRequest
    ): RejectResponseItem | Promise<RejectResponseItem> {
        if (requestItem.shouldThrowOnReject) {
            throw new Error("Reject failed for testing purposes.")
        }
        return super.reject(requestItem, params, request)
    }
}
