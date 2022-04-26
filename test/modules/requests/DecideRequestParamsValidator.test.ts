import {
    AcceptRequestItemParameters,
    AcceptRequestParameters,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestItemGroupParameters,
    DecideRequestParametersValidator
} from "@nmshd/consumption"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import { UnitTest } from "../../core/UnitTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

export class DecideRequestParametersValidatorTests extends UnitTest {
    public run(): void {
        let validator: DecideRequestParametersValidator

        beforeEach(function () {
            validator = new DecideRequestParametersValidator()
        })

        describe("DecideRequestParametersValidator", function () {
            const requestId = CoreId.from("requestId")

            const params = [
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({})],
                            requestId
                        })
                    },
                    expect: { valid: true }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({ items: [AcceptRequestItemParameters.from({})] })
                            ],
                            requestId
                        })
                    },
                    expect: { valid: true }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({})],
                            requestId: CoreId.from("invalid")
                        })
                    },
                    expect: {
                        valid: false,
                        error: {
                            code: "error.requests.decide.validation.invalidRequestId",
                            message: "The id of the request does not match the id of the response"
                        }
                    }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithTwoItems(),
                        response: AcceptRequestParameters.fromAny({
                            items: [{}],
                            requestId
                        })
                    },
                    expect: {
                        valid: false,
                        error: {
                            code: "error.requests.decide.validation.invalidNumberOfItems",
                            message: "Number of items in Request and Response do not match"
                        }
                    }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})],
                            requestId
                        })
                    },
                    expect: {
                        valid: false,
                        error: {
                            code: "error.requests.decide.validation.invalidNumberOfItems",
                            message: "Number of items in Request and Response do not match"
                        }
                    }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({})],
                            requestId
                        })
                    },
                    expect: {
                        valid: false,
                        error: {
                            code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                            message:
                                /The RequestItemGroup with index '.*' was answered as a RequestItem. Please use DecideRequestItemGroupParameters instead./
                        }
                    }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({ items: [AcceptRequestItemParameters.from({})] })
                            ],
                            requestId
                        })
                    },
                    expect: {
                        valid: false,
                        error: {
                            code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                            message:
                                /The RequestItem with index '.*' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead./
                        }
                    }
                },
                {
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({
                                    items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})]
                                })
                            ],
                            requestId
                        })
                    },
                    expect: {
                        valid: false,
                        error: {
                            code: "error.requests.decide.validation.invalidNumberOfItems",
                            message: "Number of items in RequestItemGroup and ResponseItemGroup do not match"
                        }
                    }
                }
            ]

            itParam("should validate request parameters", params, async function (data) {
                const consumptionRequest = ConsumptionRequest.from({
                    id: requestId,
                    content: data.input.request,
                    createdAt: CoreDate.utc(),
                    isOwn: true,
                    peer: CoreAddress.from("id1"),
                    source: { reference: await CoreId.generate(), type: "Message" },
                    status: ConsumptionRequestStatus.Open,
                    statusLog: []
                })

                const validationResult = validator.validate(data.input.response, consumptionRequest)

                expect(validationResult.isSuccess).to.equal(data.expect.valid)

                if (!data.expect.error) return

                expect(validationResult.error.code).to.equal(data.expect.error.code)

                const message = data.expect.error.message
                if (message instanceof RegExp) {
                    expect(validationResult.error.message).to.match(data.expect.error.message as RegExp)
                } else {
                    expect(validationResult.error.message).to.equal(data.expect.error.message)
                }
            })
        })
    }
}
