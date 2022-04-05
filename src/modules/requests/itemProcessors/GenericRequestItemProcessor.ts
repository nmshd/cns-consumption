import { ApplicationError } from "@js-soft/ts-utils"
import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItemResult } from "@nmshd/content"
import { AcceptRequestItemParameters } from "../incoming/decideRequestParameters/AcceptRequestItemParameters"
import { RejectRequestItemParameters } from "../incoming/decideRequestParameters/RejectRequestItemParameters"
import { IRequestItemProcessor } from "./IRequestItemProcessor"

export class DecideRequestValidationResult {
    private constructor(public readonly error?: DecideRequestValidationError) {}

    public get isSuccess(): boolean {
        return this.error === undefined
    }

    public get isError(): boolean {
        return this.error !== undefined
    }

    public static ok(): DecideRequestValidationResult {
        return new DecideRequestValidationResult()
    }

    public static fail(error: DecideRequestValidationError): DecideRequestValidationResult {
        return new DecideRequestValidationResult(error)
    }
}

export class DecideRequestValidationError extends ApplicationError {
    public constructor(code: string, message: string, data?: unknown[]) {
        super(code, message, data)
    }
}

export class GenericRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParameters = AcceptRequestItemParameters,
    TRejectParams extends RejectRequestItemParameters = RejectRequestItemParameters
> implements IRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams>
{
    public canAccept(_requestItem: TRequestItem, _params: TAcceptParams): Promise<DecideRequestValidationResult> {
        return Promise.resolve(DecideRequestValidationResult.ok())
    }

    public canReject(_requestItem: TRequestItem, _params: TRejectParams): Promise<DecideRequestValidationResult> {
        return Promise.resolve(DecideRequestValidationResult.ok())
    }

    public async accept(requestItem: TRequestItem, params: TAcceptParams): Promise<AcceptResponseItem> {
        const canAcceptResult = await this.canAccept(requestItem, params)

        if (canAcceptResult.isError) {
            throw new Error(canAcceptResult.error!.code + canAcceptResult.error!.message)
        }
        return await AcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            metadata: requestItem.responseMetadata
        })
    }

    public async reject(requestItem: TRequestItem, params: TRejectParams): Promise<RejectResponseItem> {
        const canRejectResult = await this.canReject(requestItem, params)

        if (canRejectResult.isError) {
            throw new Error(canRejectResult.error!.code + canRejectResult.error!.message)
        }

        return await RejectResponseItem.from({
            result: ResponseItemResult.Rejected,
            metadata: requestItem.responseMetadata
        })
    }
}
