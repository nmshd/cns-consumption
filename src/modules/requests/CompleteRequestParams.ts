import { CoreId } from "@nmshd/transport"

export interface CompleteRequestParams {
    requestId: CoreId
    items: (CompleteRequestItemParams | CompleteRequestItemGroupParams)[]
}

export type CompleteRequestItemParams = AcceptRequestItemParams | RejectRequestItemParams

export interface AcceptRequestItemParams {
    decision: RequestItemDecision.Accept
}

export interface RejectRequestItemParams {
    decision: RequestItemDecision.Reject
    code?: string
    message?: string
}

export interface CompleteRequestItemGroupParams {
    items: CompleteRequestItemParams[]
}

export enum RequestItemDecision {
    Accept = "accept",
    Reject = "reject"
}

export interface AcceptCreateAttributeRequestItemParams extends AcceptRequestItemParams {}

export interface AcceptReadAttributeRequestItemParams extends AcceptRequestItemParams {
    attributeId: CoreId
}

export interface AcceptSucceedAttributeRequestItemParams extends AcceptRequestItemParams {
    attributeId: CoreId
}

export function isCompleteRequestItemParams(obj: unknown): obj is CompleteRequestItemParams {
    return typeof obj === "object" && obj !== null && "decision" in obj
}

export function isCompleteRequestItemGroupParams(obj: unknown): obj is CompleteRequestItemGroupParams {
    return typeof obj === "object" && obj !== null && "items" in obj
}
