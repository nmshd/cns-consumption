import { ConsumptionController } from "@nmshd/consumption"
import { AccountController, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"

export class RelationshipInfoTest extends IntegrationTest {
    public run(): void {
        const that = this

        describe("RelationshipInfo", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)
            this.timeout(200000)

            let recipient: AccountController
            let sender: AccountController
            let senderConsumption: ConsumptionController

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: sender, consumptionController: senderConsumption } = accounts[0])
                ;({ accountController: recipient } = accounts[1])

                await TestUtil.addRelationship(recipient, sender)
            })

            it("relationshipInfo should be created", async function () {
                const relationship = await sender.relationships.getRelationshipToIdentity(recipient.identity.address)
                const info = await senderConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.address.substring(3, 9))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("created RelationshipInfo should be stored", async function () {
                const relationship = await sender.relationships.getRelationshipToIdentity(recipient.identity.address)
                const info = await senderConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.address.substring(3, 9))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            after(async function () {
                await sender.close()
                await recipient.close()
            })
        })
    }
}
