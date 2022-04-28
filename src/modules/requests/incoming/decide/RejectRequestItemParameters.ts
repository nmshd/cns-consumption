import { RequestItemDecision } from "./RequestItemDecision"

export interface RejectRequestItemParametersJSON {
    decision: RequestItemDecision.Reject

    code?: string
    message?: string
}
