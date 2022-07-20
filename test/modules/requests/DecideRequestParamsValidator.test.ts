import {
    DecideRequestItemGroupParametersJSON,
    DecideRequestItemParametersJSON,
    DecideRequestParametersValidator,
    ErrorValidationResult,
    LocalRequest,
    LocalRequestStatus
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
        response: {
            requestId: string
            items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[]
            accept: boolean
        }
    }
    expectedError?: {
        errorIndexPath?: number[]
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

            const successParams: TestParam[] = [
                {
                    description: "(1) success: accept request with one RequestItem and accept the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            accept: true,
                            items: [{ accept: true }],
                            requestId
                        }
                    }
                },
                {
                    description: "(2) success: accept request with RequestItemGroup and accept the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            accept: true,
                            items: [{ items: [{ accept: true }] }],
                            requestId
                        }
                    }
                },
                {
                    description: "(3) success: accept request with one RequestItem and reject the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            accept: true,
                            items: [{ accept: false }],
                            requestId
                        }
                    }
                },
                {
                    description: "(4) success: accept request with RequestItemGroup and reject the item",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            accept: true,
                            items: [{ items: [{ accept: false }] }],
                            requestId
                        }
                    }
                },
                {
                    description: "(5) success: group must not be accepted, item must be accepted; reject item",
                    input: {
                        request: Request.from({
                            items: [
                                RequestItemGroup.from({
                                    mustBeAccepted: false,
                                    items: [TestRequestItem.from({ mustBeAccepted: true })]
                                })
                            ]
                        }),
                        response: {
                            accept: true,
                            items: [
                                {
                                    items: [{ accept: false }]
                                }
                            ],
                            requestId
                        }
                    }
                },
                {
                    description: "(6) success: accept a request without accepting any item (no items mustBeAccepted)",
                    input: {
                        request: Request.from({
                            items: [TestRequestItem.from({ mustBeAccepted: false })]
                        }),
                        response: {
                            accept: true,
                            items: [{ accept: false }],
                            requestId
                        }
                    }
                },
                {
                    description: "(7) success: items that must not be accepted in a group are rejected",
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
                            accept: true,
                            items: [
                                {
                                    items: [{ accept: false }, { accept: true }]
                                }
                            ],
                            requestId
                        }
                    }
                }
            ]

            const errorParams: TestParam[] = [
                {
                    description: "(1) error: id of request is not equal to id of response",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            accept: true,
                            items: [{ accept: true }],
                            requestId: "invalid"
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidRequestId",
                        message: "The id of the request does not match the id of the response"
                    }
                },
                {
                    description: "(2) error: request with two items is answered with one item",
                    input: {
                        request: TestObjectFactory.createRequestWithTwoItems(),
                        response: {
                            accept: true,
                            items: [{ accept: true }],
                            requestId
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidNumberOfItems",
                        message: "Number of items in Request and Response do not match"
                    }
                },
                {
                    description: "(3) error: request with one item is answered with two items",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            accept: true,
                            items: [{ accept: true }, { accept: true }],
                            requestId
                        }
                    },
                    expectedError: {
                        code: "error.requests.decide.validation.invalidNumberOfItems",
                        message: "Number of items in Request and Response do not match"
                    }
                },
                {
                    description: "(4) error: request with one RequestItemGroup is answered as a RequestItem",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            accept: true,
                            items: [{ accept: true }],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItemGroup was answered as a RequestItem."
                    }
                },
                {
                    description: "(5) error: request with one RequestItem is answered as a RequestItemGroup",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            accept: true,
                            items: [{ items: [{ accept: true }] }],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem was answered as a RequestItemGroup."
                    }
                },
                {
                    description: "(6) error: RequestItemGroup and ResponseItemGroup have different number of items",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            accept: true,
                            items: [
                                {
                                    items: [{ accept: true }, { accept: true }]
                                }
                            ],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidNumberOfItems",
                        message: "Number of items in RequestItemGroup and ResponseItemGroup do not match"
                    }
                },
                {
                    description: "(7) error: item that must be accepted was rejected",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(undefined, true),
                        response: {
                            accept: true,
                            items: [{ accept: false }],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem is flagged as 'mustBeAccepted', but it was not accepted."
                    }
                },
                {
                    description: "(8) error: item in a RequestItemGroup that must be accepted was rejected",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(undefined, true),
                        response: {
                            accept: true,
                            items: [{ items: [{ accept: false }] }],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message:
                            "The RequestItemGroup is flagged as 'mustBeAccepted', but it was not accepted. Please accept all 'mustBeAccepted' items in this group."
                    }
                },
                {
                    description: "(9) error: when the request is rejected no RequestItem may be accepted",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItem(),
                        response: {
                            accept: false,
                            items: [{ accept: true }],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem was accepted, but the parent was not accepted."
                    }
                },
                {
                    description: "(10) error: when the request is rejected no RequestItemGroup may be accepted",
                    input: {
                        request: TestObjectFactory.createRequestWithOneItemGroup(),
                        response: {
                            accept: false,
                            items: [{ items: [{ accept: true }] }],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItemGroup was accepted, but the parent was not accepted."
                    }
                },
                {
                    description:
                        "(11) error: accepting a group but not accepting all 'mustBeAccepted' items in the group",
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
                            accept: true,
                            items: [
                                {
                                    items: [{ accept: true }, { accept: false }]
                                }
                            ],
                            requestId
                        }
                    },
                    expectedError: {
                        errorIndexPath: [0, 1],
                        code: "error.requests.decide.validation.invalidResponseItemForRequestItem",
                        message: "The RequestItem is flagged as 'mustBeAccepted', but it was not accepted."
                    }
                }
            ]

            itParam("${value.description}", [...successParams, ...errorParams], async function (data) {
                const consumptionRequest = LocalRequest.from({
                    id: CoreId.from(requestId),
                    content: data.input.request,
                    createdAt: CoreDate.utc(),
                    isOwn: true,
                    peer: CoreAddress.from("id1"),
                    source: { reference: await CoreId.generate(), type: "Message" },
                    status: LocalRequestStatus.Open,
                    statusLog: []
                })

                const validationResult = validator.validate(data.input.response, consumptionRequest)

                if (!data.expectedError) {
                    expect(
                        validationResult.isError(),
                        `expected success, but received the error '${
                            validationResult.isError() ? validationResult.error.code : ""
                        } - ${validationResult.isError() ? validationResult.error.message : ""}'`
                    ).to.be.false
                    return
                }

                expect(validationResult.isError(), "expected an error, but received success").to.be.true
                if (!validationResult.isError()) throw new Error()

                // no error path provided, so we expect the error to be at the root
                const errorIndexPath = data.expectedError.errorIndexPath
                if (!errorIndexPath) {
                    expect(validationResult.error.code).to.equal(data.expectedError.code)
                    expect(validationResult.error.message).to.equal(data.expectedError.message)
                    return
                }

                expect(validationResult.error.code).to.equal("inheritedFromItem")
                expect(validationResult.error.message).to.equal("Some child items have errors.")

                let childResult = validationResult
                errorIndexPath.forEach((index) => (childResult = childResult.items[index] as ErrorValidationResult))

                expect(childResult.isError(), "expected an error, but received success").to.be.true
                if (!childResult.isError()) throw new Error()

                expect(childResult.error.code).to.equal(data.expectedError.code)
                expect(childResult.error.message).to.equal(data.expectedError.message)
            })
        })
    }
}
