import { ConsumptionAttribute, ConsumptionController } from "@nmshd/consumption"
import { Attribute } from "@nmshd/content"
import { AccountController, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"

export class AttributeTest extends IntegrationTest {
    public run(): void {
        const that = this

        describe("Attributes", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)

            let consumptionController: ConsumptionController
            let testAccount: AccountController

            this.timeout(150000)

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()
                ;({ accountController: testAccount, consumptionController } = (
                    await TestUtil.provideAccounts(transport, 1)
                )[0])
            })

            it("should fill attributes", async function () {
                const familyName = await ConsumptionAttribute.fromAttribute(
                    Attribute.from({ name: "Person.familyName", value: "Becker" })
                )

                const givenName = await ConsumptionAttribute.fromAttribute(
                    Attribute.from({ name: "Person.givenName", value: "Hugo" })
                )
                expect(familyName).instanceOf(ConsumptionAttribute)
                expect(familyName.content).instanceOf(Attribute)
                expect(givenName).instanceOf(ConsumptionAttribute)
                expect(givenName.content).instanceOf(Attribute)
                await consumptionController.attributes.createAttribute(familyName)
                await consumptionController.attributes.createAttribute(givenName)
            }).timeout(15000)

            it("should list all attributes", async function () {
                const attributes = await consumptionController.attributes.getAttributes()
                expect(attributes).to.be.of.length(2)
                expect(attributes[0].content.name).to.equal("Person.familyName")
                expect(attributes[0].content.value).to.equal("Becker")
            }).timeout(15000)

            it("should return an object with all attributes", async function () {
                const map = await consumptionController.attributes.getAttributesByName()
                expect(map["Person.familyName"]).instanceOf(ConsumptionAttribute)
                expect(map["Person.familyName"].content.value).to.equal("Becker")
                expect(map["Person.givenName"]).instanceOf(ConsumptionAttribute)
                expect(map["Person.givenName"].content.value).to.equal("Hugo")
            }).timeout(15000)

            it("should fill more attributes", async function () {
                const gender = await ConsumptionAttribute.fromAttribute({ name: "Person.gender", value: "m" })
                expect(gender).instanceOf(ConsumptionAttribute)
                expect(gender.content).instanceOf(Attribute)

                const birthDate = await ConsumptionAttribute.fromAttribute({
                    name: "Person.birthDate",
                    value: "17.11.1911"
                })
                expect(birthDate).instanceOf(ConsumptionAttribute)
                expect(birthDate.content).instanceOf(Attribute)

                await consumptionController.attributes.createAttribute(gender)
                await consumptionController.attributes.createAttribute(birthDate)
            }).timeout(15000)

            it("should list all attributes again", async function () {
                const attributes = await consumptionController.attributes.getAttributes()
                expect(attributes).to.be.of.length(4)
                expect(attributes[3].content.name).equals("Person.birthDate")
                expect(attributes[3].content.value).equals("17.11.1911")
            }).timeout(15000)

            after(async function () {
                await testAccount.close()
            })
        })
    }
}
