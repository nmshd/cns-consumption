import {
    AcceptRequestItemParameters,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestItemGroupParameters,
    DecideRequestParameters,
    DecideRequestParametersValidator
} from "@nmshd/consumption"
import { IRequest } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import { UnitTest } from "../../core/UnitTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

class TestDecideRequestParameters extends DecideRequestParameters {}

export class DecideRequestParametersValidatorTests extends UnitTest {
    public run(): void {
        const that = this
        let validator: DecideRequestParametersValidator

        beforeEach(function () {
            validator = new DecideRequestParametersValidator()
        })

        describe("DecideRequestParametersValidator", function () {
            it("fails when this id is incorrect", async function () {
                const consumptionRequest = await that.createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItem()
                )

                const validationResult = validator.validate(
                    TestDecideRequestParameters.fromAny({
                        items: [AcceptRequestItemParameters.from({})],
                        requestId: CoreId.from("invalid")
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.equal(
                    "The id of the request does not match the id of the response"
                )
            })

            it("fails when number of items is too low", async function () {
                const consumptionRequest = await that.createConsumptionRequest(
                    TestObjectFactory.createRequestWithTwoItems()
                )

                const validationResult = validator.validate(
                    TestDecideRequestParameters.fromAny({ items: [{}], requestId: consumptionRequest.id }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })

            it("fails when number of items is too high", async function () {
                const consumptionRequest = await that.createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItem()
                )

                const validationResult = validator.validate(
                    TestDecideRequestParameters.fromAny({
                        items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })

            it("fails when a GroupRequest is responded with a single response", async function () {
                const consumptionRequest = await that.createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItemGroup()
                )

                const validationResult = validator.validate(
                    TestDecideRequestParameters.fromAny({
                        items: [AcceptRequestItemParameters.from({})],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.match(
                    /The RequestItemGroup '.*' was answered as a RequestItem. Please use DecideRequestItemGroupParameters instead./
                )
            })

            it("fails when a Request is responded with a group response", async function () {
                const consumptionRequest = await that.createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItem()
                )

                const validationResult = validator.validate(
                    TestDecideRequestParameters.fromAny({
                        items: [
                            DecideRequestItemGroupParameters.from({ items: [AcceptRequestItemParameters.from({})] })
                        ],
                        requestId: consumptionRequest.id
                    }),
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.match(
                    /The RequestItem '.*' was answered as a RequestItemGroup. Please use DecideRequestItemParameters instead./
                )
            })

            it("fails when a GroupRequest is responded with a group response with the wrong number of items", async function () {
                const consumptionRequest = await that.createConsumptionRequest(
                    TestObjectFactory.createRequestWithOneItemGroup()
                )

                const validationResult = validator.validate(
                    TestDecideRequestParameters.fromAny({
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
                expect(validationResult.error.message).to.equal(
                    "Number of items in RequestItemGroup and ResponseItemGroup do not match"
                )
            })
        })
    }

    private async createConsumptionRequest(content: IRequest): Promise<ConsumptionRequest> {
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
}
