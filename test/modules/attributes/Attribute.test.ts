import { ConsumptionAttribute, ConsumptionController } from "@nmshd/consumption"
import { IdentityAttribute } from "@nmshd/content"
import { AccountController, CoreAddress, CoreDate, CoreId, Transport } from "@nmshd/transport"
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
                        validTo: CoreDate.utc(),
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

            it("should delete an attribute", async function () {
                const attributes = await consumptionController.attributes.getAttributes()
                await consumptionController.attributes.deleteAttribute(attributes[0])

                const attributesAfterDelete = await consumptionController.attributes.getAttributes()
                expect(attributesAfterDelete).to.be.of.length(3)
                expect(attributesAfterDelete).not.to.have.deep.members([{ id: attributes[0]?.id }])
            })

            it("should succeed attributes", async function () {
                const surname = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "Surname",
                            value: "Becker"
                        },
                        owner: CoreAddress.from("address")
                    })
                )
                const surnameSuccessor = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "Surname",
                            value: "Wagner"
                        },
                        owner: CoreAddress.from("address")
                    })
                )
                const successorDate = CoreDate.utc()
                const attribute = await consumptionController.attributes.createAttribute(surname)
                const successor = await consumptionController.attributes.succeedAttribute(
                    attribute.id,
                    surnameSuccessor,
                    successorDate
                )
                const succeededAttribute = await consumptionController.attributes.getAttribute(attribute.id)
                expect(succeededAttribute?.content.validTo?.toISOString()).to.equal(successorDate.toISOString())

                const succeessorAttribute = await consumptionController.attributes.getAttribute(successor.id)
                expect(succeessorAttribute?.content.validFrom?.toISOString()).to.equal(successorDate.toISOString())

                const allAttributes = await consumptionController.attributes.getAttributes()
                const allAttributesJSON = allAttributes.map((v) => v.id.toString())
                expect(allAttributesJSON).to.include(succeededAttribute?.id.toString())

                const currentAttributes = consumptionController.attributes.filterCurrent(allAttributes)
                const currentAttributesJSON = currentAttributes.map((v) => v.id.toString())
                expect(currentAttributesJSON).to.not.include(succeededAttribute?.id.toString())
                expect(currentAttributesJSON).to.include(succeessorAttribute?.id.toString())
            })

            it("should allow to create a share attribute copy", async function () {
                const nationality = await ConsumptionAttribute.fromAttribute(
                    IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                )
                const nationalityAttribute = await consumptionController.attributes.createAttribute(nationality)
                const sharedNationalityAttribute =
                    await consumptionController.attributes.createSharedConsumptionAttributeCopy(
                        nationalityAttribute,
                        CoreAddress.from("address"),
                        CoreId.from("requestId")
                    )
                expect(sharedNationalityAttribute).instanceOf(ConsumptionAttribute)
                expect(sharedNationalityAttribute.shareInfo?.peer).to.deep.equal
            })

            after(async function () {
                await testAccount.close()
            })
        })
    }
}
