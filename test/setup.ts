import { Assertion } from "chai"
import { ErrorValidationResult, SuccessfulValidationResult, ValidationResult } from "../src"

export default function setup(): void {
    Assertion.addMethod("successfulValidationResult", function () {
        const obj = this._obj

        this.assert(
            obj instanceof SuccessfulValidationResult,
            `expected ${JSON.stringify(obj)} to be a ${SuccessfulValidationResult.name}, but it is an ${
                ErrorValidationResult.name
            }`,
            `expected ${JSON.stringify(obj)} to not be a ${SuccessfulValidationResult.name}, but it is.`,
            SuccessfulValidationResult,
            obj
        )
    })

    Assertion.addMethod("errorValidationResult", function (error: { code?: string; message?: string | RegExp }) {
        const obj = this._obj as ValidationResult

        this.assert(
            obj instanceof ErrorValidationResult,
            `expected ${JSON.stringify(obj)} to be an ${ErrorValidationResult.name}, but it is a ${
                SuccessfulValidationResult.name
            }`,
            `expected ${JSON.stringify(obj)} to not be an ${ErrorValidationResult.name}, but it is.`,
            ErrorValidationResult,
            obj
        )

        const errorValidationResult = obj as ErrorValidationResult

        if (error.code !== undefined) {
            this.assert(
                errorValidationResult.error.code === error.code,
                `expected the error code of the result to be '${error.code}', but received '${errorValidationResult.error.code}'.`,
                `expected the error code of the result to not be '${error.code}', but it is.`,
                error.code,
                errorValidationResult.error.code
            )
        }

        if (error.message !== undefined) {
            this.assert(
                errorValidationResult.error.message.match(error.message) !== null,
                `expected the error message of the result to match '${error.message}', but received '${errorValidationResult.error.message}'.`,
                `expected the error message of the result to not match '${error.message}', but it is.`,
                error.message,
                errorValidationResult.error.message
            )
        }
    })
}
declare global {
    namespace Chai {
        interface Assertion {
            successfulValidationResult(): Assertion
            errorValidationResult(error?: { code?: string; message?: string | RegExp }): Assertion
        }
    }
}
