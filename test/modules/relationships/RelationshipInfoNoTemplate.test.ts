import { ConsumptionController } from "@nmshd/consumption"
import { AccountController, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest } from "../../core/AbstractTest"
import { TestUtil } from "../../core/TestUtil"

export class RelationshipInfoNoTemplateTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RelationshipInfoWithNoTemplate", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)
            this.timeout(200000)

            let templator: AccountController
            let requestor: AccountController
            let senderConsumption: ConsumptionController
            let templatorConsumption: ConsumptionController

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts: AccountController[] = await TestUtil.provideAccounts(transport, 2)

                requestor = accounts[0]
                templator = accounts[1]

                senderConsumption = await new ConsumptionController(transport, requestor).init()
                templatorConsumption = await new ConsumptionController(transport, templator).init()

                await TestUtil.addRelationship(templator, requestor, {}, {})
            })

            it("relationshipInfo for requestor should be created", async function () {
                const relationship = await requestor.relationships.getRelationshipToIdentity(templator.identity.address)
                const info = await senderConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.toString().substring(3, 9))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("created RelationshipInfo for requestor should be stored", async function () {
                const relationship = await requestor.relationships.getRelationshipToIdentity(templator.identity.address)
                const info = await senderConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.toString().substring(3, 9))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("relationshipInfo for templator should be created", async function () {
                const relationship = await templator.relationships.getRelationshipToIdentity(requestor.identity.address)
                const info = await templatorConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.toString().substring(3, 9))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("created RelationshipInfo for templator should be stored", async function () {
                const relationship = await templator.relationships.getRelationshipToIdentity(requestor.identity.address)
                const info = await templatorConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.toString().substring(3, 9))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            after(async function () {
                await requestor.close()
                await templator.close()
            })
        })
    }
}
