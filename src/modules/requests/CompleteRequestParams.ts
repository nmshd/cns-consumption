import { CoreId } from "@nmshd/transport"

export interface CompleteRequestParams {
    requestId: CoreId
    items: (CompleteRequestItemParams | CompleteRequestItemGroupParams)[]
}

export type CompleteRequestItemParams = AcceptRequestItemParams | RejectRequestItemParams

export type CompleteRequestItemGroupParams = AcceptRequestItemGroupParams | RejectRequestItemGroupParams

export interface AcceptRequestItemParams {
    decision: RequestItemDecision.Accept
}

export interface RejectRequestItemParams {
    decision: RequestItemDecision.Reject
    code?: string
    message?: string
}

export interface AcceptRequestItemGroupParams {
    items: CompleteRequestItemParams[]
}

export interface RejectRequestItemGroupParams {
    items: CompleteRequestItemParams[]
    code?: string
    message?: string
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
