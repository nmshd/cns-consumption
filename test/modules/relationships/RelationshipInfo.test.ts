import { ConsumptionController, SingleRelationshipController } from "@nmshd/consumption"
import { AccountController, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest } from "../../core/AbstractTest"
import { TestUtil } from "../../core/TestUtil"

export class RelationshipInfoTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RelationshipInfo", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)
            this.timeout(200000)

            let recipient: AccountController
            let sender: AccountController
            let senderConsumption: ConsumptionController
            let recipientConsumption: ConsumptionController

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts: AccountController[] = await TestUtil.provideAccounts(transport, 2)

                sender = accounts[0]
                recipient = accounts[1]

                senderConsumption = await new ConsumptionController(transport, sender).init()
                recipientConsumption = await new ConsumptionController(transport, sender).init()

                await TestUtil.addRelationship(recipient, sender)
            })

            it("relationshipInfo should be created", async function () {
                const relationship = await sender.relationships.getRelationshipToIdentity(recipient.identity.address)
                const single = await new SingleRelationshipController(senderConsumption).initWithRelationship(
                    relationship!
                )
                expect(single.info).to.exist
                expect(single.info.title).to.equal(relationship?.peer.address.address.substring(3, 6))
                expect(single.info.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("created RelationshipInfo should be fetched again", async function () {
                const relationship = await sender.relationships.getRelationshipToIdentity(recipient.identity.address)
                const single = await new SingleRelationshipController(senderConsumption).initWithRelationship(
                    relationship!
                )
                expect(single.info).to.exist
                expect(single.info.title).to.equal(relationship?.peer.address.address.substring(3, 6))
                expect(single.info.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("created RelationshipInfo should be stored", async function () {
                const relationship = await sender.relationships.getRelationshipToIdentity(recipient.identity.address)
                const info = await senderConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.address.substring(3, 6))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            it("created RelationshipInfo should be created lazily on recipient", async function () {
                const relationship = await recipient.relationships.getRelationshipToIdentity(sender.identity.address)
                const info = await recipientConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship!.id
                )
                expect(info).to.exist
                expect(info!.title).to.equal(relationship?.peer.address.address.substring(3, 6))
                expect(info!.relationshipId.toString()).to.equal(relationship!.id.toString())
            })

            after(async function () {
                await sender.close()
                await recipient.close()
            })
        })
    }
}
