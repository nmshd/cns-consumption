import {
    AcceptRequestItemParameters,
    AcceptRequestParameters,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestItemGroupParameters,
    DecideRequestParametersValidator
} from "@nmshd/consumption"
import { IRequest } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import { UnitTest } from "../../core/UnitTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

export class DecideRequestParametersValidatorTests extends UnitTest {
    public run(): void {
        let validator: DecideRequestParametersValidator

        beforeEach(function () {
            validator = new DecideRequestParametersValidator()
        })

        describe("DecideRequestParametersValidator", function () {
            it("fails when this id is incorrect", async function () {
                const consumptionRequest = await createConsumptionRequest(TestObjectFactory.createRequestWithOneItem())

                const validationResult = validator.validate(
                    AcceptRequestParameters.fromAny({
                        items: [AcceptRequestItemParameters.from({})],
                        requestId: CoreId.from("invalid")
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.code).to.equal("error.requests.decide.validation.invalidRequestId")
                expect(validationResult.error.message).to.equal(
                    "The id of the request does not match the id of the response"
                )
            })

            it("fails when number of items in the response is lower than the items in the request", async function () {
                const consumptionRequest = await createConsumptionRequest(TestObjectFactory.createRequestWithTwoItems())

                const validationResult = validator.validate(
                    AcceptRequestParameters.fromAny({ items: [{}], requestId: consumptionRequest.id }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.code).to.equal("error.requests.decide.validation.invalidNumberOfItems")
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })

            it("fails when number of items in the response is higher than the items in the request", async function () {
                const consumptionRequest = await createConsumptionRequest(TestObjectFactory.createRequestWithOneItem())

                const validationResult = validator.validate(
                    AcceptRequestParameters.fromAny({
                        items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.code).to.equal("error.requests.decide.validation.invalidNumberOfItems")
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })

            it("fails when a RequestItemGroup is answered with parameters for a RequestItem", async function () {
                const consumptionRequest = await createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItemGroup()
                )

                const validationResult = validator.validate(
                    AcceptRequestParameters.fromAny({
                        items: [AcceptRequestItemParameters.from({})],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.code).to.equal(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem"
                )
                expect(validationResult.error.message).to.match(
                    /The RequestItemGroup '.*' was answered as a RequestItem. Please use DecideRequestItemGroupParameters instead./
                )
            })

            it("fails when a RequestItem is answered with parameters for a RequestItemGroup", async function () {
                const consumptionRequest = await createConsumptionRequest(TestObjectFactory.createRequestWithOneItem())

                const validationResult = validator.validate(
                    AcceptRequestParameters.fromAny({
                        items: [
                            DecideRequestItemGroupParameters.from({ items: [AcceptRequestItemParameters.from({})] })
                        ],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.code).to.equal(
                    "error.requests.decide.validation.invalidResponseItemForRequestItem"
                )
                expect(validationResult.error.message).to.match(
                    /The RequestItem '.*' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead./
                )
            })

            it("fails when a RequestItemGroup is responded with a parameters for a RequestItemGroup with the wrong number of items", async function () {
                const consumptionRequest = await createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItemGroup()
                )

                const validationResult = validator.validate(
                    AcceptRequestParameters.fromAny({
                        items: [
                            DecideRequestItemGroupParameters.from({
                                items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})]
                            })
                        ],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.code).to.equal("error.requests.decide.validation.invalidNumberOfItems")
                expect(validationResult.error.message).to.equal(
                    "Number of items in RequestItemGroup and ResponseItemGroup do not match"
                )
            })
        })
    }
}

async function createConsumptionRequest(content: IRequest): Promise<ConsumptionRequest> {
    const consumptionRequest = ConsumptionRequest.from({
        id: await CoreId.generate(),
        content: content,
        createdAt: CoreDate.utc(),
        isOwn: true,
        peer: CoreAddress.from("id1"),
        source: { reference: await CoreId.generate(), type: "Message" },
        status: ConsumptionRequestStatus.Open,
        statusLog: []
    })

    return consumptionRequest
}
