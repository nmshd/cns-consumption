import {
    AcceptRequestItemParameters,
    AcceptRequestParameters,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestItemGroupParameters,
    DecideRequestParameters,
    DecideRequestParametersValidator,
    RejectRequestItemParameters
} from "@nmshd/consumption"
import { Request } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import { UnitTest } from "../../core/UnitTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

interface TestParam {
    description: string
    input: {
        request: Request
        response: DecideRequestParameters
    }
    expectedError?: {
        code: string
        message: string
    }
}

export class DecideRequestParametersValidatorTests extends UnitTest {
    public run(): void {
        let validator: DecideRequestParametersValidator

        beforeEach(function () {
            validator = new DecideRequestParametersValidator()
        })

        describe("DecideRequestParametersValidator", function () {
            const requestId = CoreId.from("requestId")

            const params: TestParam[] = [
                {
                    description: "(1) success: accept request with one RequestItem and accept the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({})],
                            requestId
                        })
                    }
                },
                {
                    description: "(2) success: accept request with RequestItemGroup and accept the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({ items: [AcceptRequestItemParameters.from({})] })
                            ],
                            requestId
                        })
                    }
                },
                {
                    description: "(3) success: accept request with one RequestItem and reject the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [RejectRequestItemParameters.from({})],
                            requestId
                        })
                    }
                },
                {
                    description: "(4) success: accept request with RequestItemGroup and reject the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({ items: [RejectRequestItemParameters.from({})] })
                            ],
                            requestId
                        })
                    }
                },
                {
                    description: "(5) error: id of request is not equal to id of response",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({})],
                            requestId: CoreId.from("invalid")
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidRequestId",
                        message: "The id of the request does not match the id of the response"
                    }
                },
                {
                    description: "(6) error: request with two items is answered with one item",
                    input: {
                        request: TestObjectFactory.createRequestWithTwoItems(),
                        response: AcceptRequestParameters.fromAny({
                            items: [{}],
                            requestId
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidNumberOfItems",
                        message: "Number of items in Request and Response do not match"
                    }
                },
                {
                    description: "(7) error: request with one item is answered with two items",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})],
                            requestId
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidNumberOfItems",
                        message: "Number of items in Request and Response do not match"
                    }
                },
                {
                    description: "(8) error: request with one RequestItemGroup is answered as a RequestItem",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: AcceptRequestParameters.fromAny({
                            items: [AcceptRequestItemParameters.from({})],
                            requestId
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItemGroup with index '0' was answered as a RequestItem. Please use DecideRequestItemGroupParameters instead."
                    }
                },
                {
                    description: "(9) error: request with one RequestItem is answered as a RequestItemGroup",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({ items: [AcceptRequestItemParameters.from({})] })
                            ],
                            requestId
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItem with index '0' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead."
                    }
                },
                {
                    description: "(10) error: RequestItemGroup and ResponseItemGroup have different number of items",
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
                    expectedError: {
                        code: "error.requests.decide.validation.invalidNumberOfItems",
                        message: "Number of items in RequestItemGroup and ResponseItemGroup do not match"
                    }
                },
                {
                    description: "(11) error: item that must be accepted was rejected",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(undefined, true),
                        response: AcceptRequestParameters.fromAny({
                            items: [RejectRequestItemParameters.from({})],
                            requestId
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItem with index '0' that is flagged as required was not accepted. Please use AcceptRequestItemParameters instead."
                    }
                },
                {
                    description: "(12) error: item in a RequestItemGroup that must be accepted was rejected",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(undefined, true),
                        response: AcceptRequestParameters.fromAny({
                            items: [
                                DecideRequestItemGroupParameters.from({ items: [RejectRequestItemParameters.from({})] })
                            ],
                            requestId
                        })
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItem with index '0.0' that is flagged as required was not accepted. Please use AcceptRequestItemParameters instead."
                    }
                }
            ]

            itParam("${value.description}", params, async function (data) {
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

                expect(validationResult.isError).to.equal(!!data.expectedError)

                if (!data.expectedError) return

                expect(validationResult.error.code).to.equal(data.expectedError.code)
                expect(validationResult.error.message).to.equal(data.expectedError.message)
            })
        })
    }
}
