import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItemResult } from "@nmshd/content"
import { TestRequestItem } from "../../../../test/modules/requests/testHelpers/TestRequestItem"
import { AcceptRequestItemParameters } from "../incoming/decideRequestParameters/AcceptRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decideRequestParameters/RejectRequestItemParameters"
import { IRequestItemProcessor } from "./IRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> implements IRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams>
{
    public checkPrerequisitesOfIncomingRequestItem(_requestItem: TestRequestItem): Promise<boolean> {
        return Promise.resolve(true)
    }

    public canAccept(_requestItem: TRequestItem, _params: TAcceptParams): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.success())
    }

    public canReject(_requestItem: TRequestItem, _params: TRejectParams): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.success())
    }

    public async accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem> {
        const canAcceptResult = await this.canAccept(requestItem, params)

        if (canAcceptResult.isError()) {
            throw new Error(`Error while accepting a RequestItem: ${canAcceptResult.code} - ${canAcceptResult.message}`)
        }

        return await AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public async reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem> {
        const canRejectResult = await this.canReject(requestItem, params)

        if (canRejectResult.isError()) {
            throw new Error(`Error while rejecting a RequestItem: ${canRejectResult.code} - ${canRejectResult.message}`)
        }

        return await RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }

    public validateIncomingResponseItem(
        _responseItem: AcceptResponseItem,
        _requestItem: TRequestItem
    ): Promise<boolean> {
        return Promise.resolve(true)
    }

    public validateOutgoingRequestItem(_requestItem: TestRequestItem): Promise<ValidationResult> {
        return Promise.resolve(ValidationResult.success())
    }

    public applyIncomingResponseItem(_responseItem: AcceptResponseItem, _requestItem: TestRequestItem): Promise<void> {
        // do nothing
        return Promise.resolve()
    }
}
