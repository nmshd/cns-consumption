import { AcceptResponseItem, RejectResponseItem, Request, RequestItem, ResponseItem } from "@nmshd/content"
import { AccountController, CoreAddress } from "@nmshd/transport"
import { ConsumptionController } from "../../../consumption/ConsumptionController"
import { AcceptRequestItemParametersJSON } from "../incoming/decide/AcceptRequestItemParameters"
import { RejectRequestItemParametersJSON } from "../incoming/decide/RejectRequestItemParameters"
import { ConsumptionRequestInfo, IRequestItemProcessor } from "./IRequestItemProcessor"
import { ValidationResult } from "./ValidationResult"

export abstract class AbstractRequestItemProcessor<
    TRequestItem extends RequestItem = RequestItem,
    TAcceptParams extends AcceptRequestItemParametersJSON = AcceptRequestItemParametersJSON,
    TRejectParams extends RejectRequestItemParametersJSON = RejectRequestItemParametersJSON
> implements IRequestItemProcessor<TRequestItem, TAcceptParams, TRejectParams>
{
    protected accountController: AccountController
    protected currentIdentityAddress: CoreAddress

    public constructor(protected readonly consumptionController: ConsumptionController) {
        this.accountController = this.consumptionController.accountController
        this.currentIdentityAddress = this.accountController.identity.address
    }

    public abstract checkPrerequisitesOfIncomingRequestItem(
        requestItem: TRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): boolean | Promise<boolean>
    public abstract canAccept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        requestInfo: ConsumptionRequestInfo
    ): ValidationResult | Promise<ValidationResult>
    public abstract canReject(
        requestItem: TRequestItem,
        params: TRejectParams,
        requestInfo: ConsumptionRequestInfo
    ): ValidationResult | Promise<ValidationResult>
    public abstract accept(
        requestItem: TRequestItem,
        params: TAcceptParams,
        requestInfo: ConsumptionRequestInfo
    ): AcceptResponseItem | Promise<AcceptResponseItem>
    public abstract reject(
        requestItem: TRequestItem,
        params: TRejectParams,
        requestInfo: ConsumptionRequestInfo
    ): RejectResponseItem | Promise<RejectResponseItem>
    public abstract canCreateOutgoingRequestItem(
        requestItem: TRequestItem,
        request: Request,
        recipient: CoreAddress
    ): ValidationResult | Promise<ValidationResult>
    public abstract canApplyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): ValidationResult | Promise<ValidationResult>
    public abstract applyIncomingResponseItem(
        responseItem: ResponseItem,
        requestItem: TRequestItem,
        requestInfo: ConsumptionRequestInfo
    ): void | Promise<void>
}
