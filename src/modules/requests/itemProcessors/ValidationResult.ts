export abstract class ValidationResult {
    protected constructor(public readonly items: ValidationResult[]) {}

    public isSuccess(): this is SuccessfulValidatonResult {
        return this instanceof SuccessfulValidatonResult
    }

    public isError(): this is ErrorValidationResult {
        return this instanceof ErrorValidationResult
    }

    public static success(items: ValidationResult[] = []): SuccessfulValidatonResult {
        return new SuccessfulValidatonResult(items)
    }

    public static error(code: string, message: string, items: ValidationResult[] = []): ErrorValidationResult {
        return new ErrorValidationResult(code, message, items)
    }

    public static fromItems(items: ValidationResult[]): ValidationResult {
        return items.some((r) => r.isError())
            ? ValidationResult.error("inheritedFromItem", "Some child items have errors.", items)
            : ValidationResult.success(items)
    }
}

export class SuccessfulValidatonResult extends ValidationResult {
    public constructor(items: ValidationResult[]) {
        super(items)
    }
}

export class ErrorValidationResult extends ValidationResult {
    public constructor(public readonly code: string, public readonly message: string, items: ValidationResult[]) {
        super(items)
    }
}
