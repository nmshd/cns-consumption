import { ConsumptionAttribute, ConsumptionController } from "@nmshd/consumption"
import { IdentityAttribute } from "@nmshd/content"
import { AccountController, CoreAddress, Transport } from "@nmshd/transport"
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

                const account = (await TestUtil.provideAccounts(transport, 1))[0]
                ;({ accountController: testAccount, consumptionController } = account)
            })

            it("should fill attributes", async function () {
                const surname = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "Surname",
                            value: "Becker"
                        },
                        owner: CoreAddress.from("address")
                    })
                )

                const givenName = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "Hugo"
                        },
                        owner: CoreAddress.from("address")
                    })
                )
                expect(surname).instanceOf(ConsumptionAttribute)
                expect(surname.content).instanceOf(IdentityAttribute)
                expect(givenName).instanceOf(ConsumptionAttribute)
                expect(givenName.content).instanceOf(IdentityAttribute)
                await consumptionController.attributes.createAttribute(surname)
                await consumptionController.attributes.createAttribute(givenName)
            }).timeout(15000)

            it("should list all attributes", async function () {
                const attributes = await consumptionController.attributes.getAttributes()
                expect(attributes).to.be.of.length(2)
                // expect(attributes[0].content).instanceOf(IdentityAttribute)
                // expect(attributes[1].content).instanceOf(IdentityAttribute)
            }).timeout(15000)

            it("should fill more attributes", async function () {
                const address = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "Hugo Becker",
                            street: "Straße",
                            houseNo: "1",
                            zipCode: "123456",
                            city: "Stadt",
                            country: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                )
                expect(address).instanceOf(ConsumptionAttribute)
                expect(address.content).instanceOf(IdentityAttribute)

                const birthDate = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "BirthDate",
                            day: 22,
                            month: 2,
                            year: 2022
                        },
                        owner: CoreAddress.from("address")
                    })
                )
                expect(birthDate).instanceOf(ConsumptionAttribute)
                expect(birthDate.content).instanceOf(IdentityAttribute)

                await consumptionController.attributes.createAttribute(address)
                await consumptionController.attributes.createAttribute(birthDate)
            }).timeout(15000)

            it("should list all attributes again", async function () {
                const attributes = await consumptionController.attributes.getAttributes()
                expect(attributes).to.be.of.length(4)
            }).timeout(15000)

            after(async function () {
                await testAccount.close()
            })
        })
    }
}
