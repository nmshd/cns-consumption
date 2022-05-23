import { AcceptResponseItem, RejectResponseItem, RequestItem, ResponseItem } from "@nmshd/content"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters"
import { ConsumptionRequest } from "../local/ConsumptionRequest"
import { IRequestItemProcessor } from "./IRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export abstract class AbstractRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> implements IRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams>
{
    public constructor(protected readonly consumptionController: ConsumptionController) {}

    public abstract checkPrerequisitesOfIncomingRequestItem(requestItem: TRequestItem): boolean | Promise<boolean>
    public abstract canAccept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        request: ConsumptionRequest
    ): ValidationResult | Promise<ValidationResult>
    public abstract canReject(
        requestItem: TRequestItem,
        params: TRejectParams,
        request: ConsumptionRequest
    ): ValidationResult | Promise<ValidationResult>
    public abstract accept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        request: ConsumptionRequest
    ): AcceptResponseItem | Promise<AcceptResponseItem>
    public abstract reject(
        requestItem: TRequestItem,
        params: TRejectParams,
        request: ConsumptionRequest
    ): RejectResponseItem | Promise<RejectResponseItem>
    public abstract canCreateOutgoingRequestItem(
        requestItem: TRequestItem
    ): ValidationResult | Promise<ValidationResult>
    public abstract canApplyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        request: ConsumptionRequest
    ): ValidationResult | Promise<ValidationResult>
    public abstract applyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        request: ConsumptionRequest
    ): void | Promise<void>
}
