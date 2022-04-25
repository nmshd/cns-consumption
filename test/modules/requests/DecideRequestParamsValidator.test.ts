import {
    AcceptRequestItemParameters,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    DecideRequestParametersValidator
} from "@nmshd/consumption"
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
            it("fails when number of items is too low", async function () {
                const consumptionRequest = ConsumptionRequest.from({
                    id: await CoreId.generate(),
                    content: TestObjectFactory.createRequestWithOneItem(),
                    createdAt: CoreDate.utc(),
                    isOwn: true,
                    peer: CoreAddress.from("id1"),
                    source: { reference: await CoreId.generate(), type: "Message" },
                    status: ConsumptionRequestStatus.Open,
                    statusLog: []
                })

                const validationResult = validator.validate(
                    { items: [], requestId: consumptionRequest.id },
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })
            it("fails when number of items is too high", async function () {
                const consumptionRequest = ConsumptionRequest.from({
                    id: await CoreId.generate(),
                    content: TestObjectFactory.createRequestWithOneItem(),
                    createdAt: CoreDate.utc(),
                    isOwn: true,
                    peer: CoreAddress.from("id1"),
                    source: { reference: await CoreId.generate(), type: "Message" },
                    status: ConsumptionRequestStatus.Open,
                    statusLog: []
                })

                const validationResult = validator.validate(
                    {
                        items: [AcceptRequestItemParameters.from({}), AcceptRequestItemParameters.from({})],
                        requestId: consumptionRequest.id
                    },
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })
        })
    }
}
