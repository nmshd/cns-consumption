import { ApplicationError } from "@js-soft/ts-utils"

export class DecideRequestItemValidationResult {
    private constructor(public readonly error?: DecideRequestItemValidationError) {}

    public get isSuccess(): boolean {
        return this.error === undefined
    }

    public get isError(): boolean {
        return this.error !== undefined
    }

    public static ok(): DecideRequestItemValidationResult {
        return new DecideRequestItemValidationResult()
    }

    public static fail(error: DecideRequestItemValidationError): DecideRequestItemValidationResult {
        return new DecideRequestItemValidationResult(error)
    }
}

export class DecideRequestItemValidationError extends ApplicationError {
    public constructor(code: string, message: string, data?: unknown[]) {
        super(code, message, data)
    }
}
