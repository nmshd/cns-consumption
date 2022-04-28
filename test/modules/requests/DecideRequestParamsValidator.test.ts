import {
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestParametersValidator,
    InternalDecideRequestParametersJSON,
    RequestDecision,
    RequestItemDecision
} from "@nmshd/consumption"
import { Request, RequestItemGroup } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import itParam from "mocha-param"
import { UnitTest } from "../../core/UnitTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"
import { TestRequestItem } from "./testHelpers/TestRequestItem"

interface TestParam {
    description: string
    input: {
        request: Request
        response: InternalDecideRequestParametersJSON
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
            const requestId = "requestId"

            const params: TestParam[] = [
                {
                    description: "(1) success: accept request with one RequestItem and accept the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            items: [{ decision: RequestItemDecision.Accept }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    }
                },
                {
                    description: "(2) success: accept request with RequestItemGroup and accept the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            items: [{ items: [{ decision: RequestItemDecision.Accept }] }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    }
                },
                {
                    description: "(3) success: accept request with one RequestItem and reject the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            items: [{ decision: RequestItemDecision.Reject }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    }
                },
                {
                    description: "(4) success: accept request with RequestItemGroup and reject the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            items: [{ items: [{ decision: RequestItemDecision.Reject }] }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    }
                },
                {
                    description: "(5) error: id of request is not equal to id of response",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            items: [{ decision: RequestItemDecision.Accept }],
                            requestId: "invalid",
                            decision: RequestDecision.Accept
                        }
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
                        response: {
                            items: [{ decision: RequestItemDecision.Accept }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
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
                        response: {
                            items: [{ decision: RequestItemDecision.Accept }, { decision: RequestItemDecision.Accept }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
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
                        response: {
                            items: [{ decision: RequestItemDecision.Accept }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItemGroup with index '0' was answered as a RequestItem."
                    }
                },
                {
                    description: "(9) error: request with one RequestItem is answered as a RequestItemGroup",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            items: [{ items: [{ decision: RequestItemDecision.Accept }] }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem with index '0' was answered as a RequestItemGroup."
                    }
                },
                {
                    description: "(10) error: RequestItemGroup and ResponseItemGroup have different number of items",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            items: [
                                {
                                    items: [
                                        { decision: RequestItemDecision.Accept },
                                        { decision: RequestItemDecision.Accept }
                                    ]
                                }
                            ],
                            requestId,
                            decision: RequestDecision.Accept
                        }
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
                        response: {
                            items: [{ decision: RequestItemDecision.Reject }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem with index '0' that is flagged as 'mustBeAccepted' was not accepted."
                    }
                },
                {
                    description: "(12) error: item in a RequestItemGroup that must be accepted was rejected",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(undefined, true),
                        response: {
                            items: [{ items: [{ decision: RequestItemDecision.Reject }] }],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItemGroup with index '0' that is flagged as 'mustBeAccepted' was not accepted. Please accept all 'mustBeAccepted' items in this group."
                    }
                },
                {
                    description: "(13) error: when the request is rejected no RequestItem may be accepted",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            items: [{ decision: RequestItemDecision.Accept }],
                            requestId,
                            decision: RequestDecision.Reject
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem with index '0' was accepted, but the parent was not accepted."
                    }
                },
                {
                    description: "(14) error: when the request is rejected no RequestItemGroup may be accepted",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            items: [{ items: [{ decision: RequestItemDecision.Accept }] }],
                            requestId,
                            decision: RequestDecision.Reject
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItemGroup with index '0' was accepted, but the parent was not accepted."
                    }
                },
                {
                    description:
                        "(15) error: accepting a group but not accepting all 'mustBeAccepted' items in the group",
                    input: {
                        request: Request.from({
                            items: [
                                RequestItemGroup.from({
                                    items: [
                                        TestRequestItem.from({ mustBeAccepted: true }),
                                        TestRequestItem.from({ mustBeAccepted: true })
                                    ],
                                    mustBeAccepted: false
                                })
                            ]
                        }),
                        response: {
                            items: [
                                {
                                    items: [
                                        { decision: RequestItemDecision.Accept },
                                        { decision: RequestItemDecision.Reject }
                                    ]
                                }
                            ],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItem with index '0.1' that is flagged as 'mustBeAccepted' was not accepted."
                    }
                },
                {
                    description: "(15) success: items that must not be accepted in a group are rejected",
                    input: {
                        request: Request.from({
                            items: [
                                RequestItemGroup.from({
                                    items: [
                                        TestRequestItem.from({ mustBeAccepted: false }),
                                        TestRequestItem.from({ mustBeAccepted: true })
                                    ],
                                    mustBeAccepted: false
                                })
                            ]
                        }),
                        response: {
                            items: [
                                {
                                    items: [
                                        { decision: RequestItemDecision.Reject },
                                        { decision: RequestItemDecision.Accept }
                                    ]
                                }
                            ],
                            requestId,
                            decision: RequestDecision.Accept
                        }
                    }
                }
            ]

            itParam("${value.description}", params, async function (data) {
                const consumptionRequest = ConsumptionRequest.from({
                    id: CoreId.from(requestId),
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
