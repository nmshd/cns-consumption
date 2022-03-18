import { ILoggerFactory } from "@js-soft/logging-abstractions"
import {
    CompleteRequestParamsValidator,
    ConsumptionRequest,
    ConsumptionRequestStatus,
    RequestItemDecision
} from "@nmshd/consumption"
import { Request } from "@nmshd/content"
import { CoreAddress, CoreDate, CoreId } from "@nmshd/transport"
import { expect } from "chai"
import { UnitTest } from "../../core/UnitTest"
import { TestObjectFactory } from "./testHelpers/TestObjectFactory"

export class CompleteRequestParamsValidatorTests extends UnitTest {
    public constructor(protected loggerFactory: ILoggerFactory) {
        super(loggerFactory)
    }

    public run(): void {
        let validator: CompleteRequestParamsValidator

        beforeEach(function () {
            validator = new CompleteRequestParamsValidator()
        })

        describe("CompleteRequestParamsValidator", function () {
            it("fails when number of items is too low", async function () {
                const consumptionRequest = await ConsumptionRequest.from({
                    id: await CoreId.generate(),
                    content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                    createdAt: CoreDate.utc(),
                    isOwn: true,
                    peer: CoreAddress.from("id1"),
                    sourceReference: await CoreId.generate(),
                    sourceType: "Message",
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
                const consumptionRequest = await ConsumptionRequest.from({
                    id: await CoreId.generate(),
                    content: await Request.from(TestObjectFactory.createRequestWithOneItem()),
                    createdAt: CoreDate.utc(),
                    isOwn: true,
                    peer: CoreAddress.from("id1"),
                    sourceReference: await CoreId.generate(),
                    sourceType: "Message",
                    status: ConsumptionRequestStatus.Open,
                    statusLog: []
                })

                const validationResult = validator.validate(
                    {
                        items: [{ decision: RequestItemDecision.Accept }, { decision: RequestItemDecision.Accept }],
                        requestId: consumptionRequest.id
                    },
                    consumptionRequest
                )
                expect(validationResult.isError).to.be.true
                expect(validationResult.error.message).to.equal("Number of items in Request and Response do not match")
            })

            // its("fails when number of items in a group is too low", function () {
            //     expect(true).to.be.false
            // })

            // its("fails when number of items in a group is too high", function () {
            //     expect(true).to.be.false
            // })
        })
    }
}
