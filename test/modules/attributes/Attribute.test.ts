import {
    ConsumptionAttribute,
    ConsumptionController,
    ICreateConsumptionAttributeParams,
    ICreateSharedConsumptionAttributeCopyParams,
    ISucceedConsumptionAttributeParams
} from "@nmshd/consumption"
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

            beforeEach(async function () {
                const surnameParams: ICreateConsumptionAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Surname",
                            value: "ASurname"
                        },
                        owner: CoreAddress.from("address")
                    })
                }

                const givenNamesParams: ICreateConsumptionAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "AGivenName"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                await consumptionController.attributes.createConsumptionAttribute(surnameParams)
                await consumptionController.attributes.createConsumptionAttribute(givenNamesParams)
            })

            it("should list all attributes", async function () {
                const attributes = await consumptionController.attributes.getConsumptionAttributes()
                expect(attributes).to.be.of.length(2)
            })

            it("should create new attributes", async function () {
                const attributesBeforeCreate = await consumptionController.attributes.getConsumptionAttributes()
                const nrAttributesBeforeCreate = attributesBeforeCreate.length

                const addressParams: ICreateConsumptionAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "StreetAddress",
                            recipient: "ARecipient",
                            street: "AStreet",
                            houseNo: "AHouseNo",
                            zipCode: "AZipCode",
                            city: "ACity",
                            country: "DE"
                        },
                        validTo: CoreDate.utc(),
                        owner: CoreAddress.from("address")
                    })
                }

                const birthDateParams: ICreateConsumptionAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "BirthDate",
                            day: 22,
                            month: 2,
                            year: 2022
                        },
                        owner: CoreAddress.from("address")
                    })
                }

                const address = await consumptionController.attributes.createConsumptionAttribute(addressParams)
                expect(address).instanceOf(ConsumptionAttribute)
                expect(address.content).instanceOf(IdentityAttribute)
                const birthDate = await consumptionController.attributes.createConsumptionAttribute(birthDateParams)
                expect(birthDate).instanceOf(ConsumptionAttribute)
                expect(birthDate.content).instanceOf(IdentityAttribute)

                const attributesAfterCreate = await consumptionController.attributes.getConsumptionAttributes()
                const nrAttributesAfterCreate = attributesAfterCreate.length
                expect(nrAttributesAfterCreate).equals(nrAttributesBeforeCreate + 2)
            }).timeout(15000)

            it("should delete an attribute", async function () {
                const attributes = await consumptionController.attributes.getConsumptionAttributes()
                const nrAttributesBeforeDelete = attributes.length
                await consumptionController.attributes.deleteAttribute(attributes[0])

                const attributesAfterDelete = await consumptionController.attributes.getConsumptionAttributes()
                const nrAttributesAfterDelete = attributesAfterDelete.length
                expect(nrAttributesAfterDelete).equals(nrAttributesBeforeDelete - 1)

                const attributesJSON = attributesAfterDelete.map((v) => v.id.toString())
                expect(attributesJSON).not.to.include(attributes[0]?.id.toString())
            })

            it("should succeed attributes", async function () {
                const displayNameParams: ICreateConsumptionAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "DisplayName",
                            value: "ADisplayName"
                        },
                        owner: CoreAddress.from("address")
                    })
                }

                const successorDate = CoreDate.utc()
                const displayNameSuccessor = IdentityAttribute.from({
                    value: {
                        "@type": "DisplayName",
                        value: "ANewDisplayName"
                    },
                    owner: CoreAddress.from("address"),
                    validFrom: successorDate
                })

                const attribute = await consumptionController.attributes.createConsumptionAttribute(displayNameParams)
                const createSuccessorParams: ISucceedConsumptionAttributeParams = {
                    successorContent: displayNameSuccessor,
                    succeeds: attribute.id
                }
                const successor = await consumptionController.attributes.succeedConsumptionAttribute(
                    createSuccessorParams
                )
                const succeededAttribute = await consumptionController.attributes.getConsumptionAttribute(attribute.id)
                expect(succeededAttribute?.content.validTo?.toISOString()).to.equal(
                    successorDate.subtract(1).toISOString()
                )

                const succeessorAttribute = await consumptionController.attributes.getConsumptionAttribute(successor.id)
                expect(succeessorAttribute?.content.validFrom?.toISOString()).to.equal(successorDate.toISOString())

                const allAttributes = await consumptionController.attributes.getConsumptionAttributes()
                const allAttributesJSON = allAttributes.map((v) => v.id.toString())
                expect(allAttributesJSON).to.include(succeededAttribute?.id.toString())

                const currentAttributes = consumptionController.attributes.filterCurrent(allAttributes)
                const currentAttributesJSON = currentAttributes.map((v) => v.id.toString())
                expect(currentAttributesJSON).to.not.include(succeededAttribute?.id.toString())
                expect(currentAttributesJSON).to.include(succeessorAttribute?.id.toString())
            })

            it("should allow to create a share attribute copy", async function () {
                const nationalityParams: ICreateConsumptionAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                const nationalityAttribute = await consumptionController.attributes.createConsumptionAttribute(
                    nationalityParams
                )

                const peer = CoreAddress.from("address")
                const createSharedAttributesParams: ICreateSharedConsumptionAttributeCopyParams = {
                    attributeId: nationalityAttribute.id,
                    peer: peer,
                    requestReference: CoreId.from("requestId")
                }

                const sharedNationalityAttribute =
                    await consumptionController.attributes.createSharedConsumptionAttributeCopy(
                        createSharedAttributesParams
                    )
                expect(sharedNationalityAttribute).instanceOf(ConsumptionAttribute)
                expect(sharedNationalityAttribute.shareInfo?.peer).to.deep.equal(peer)
            })

            afterEach(async function () {
                const attributes = await consumptionController.attributes.getConsumptionAttributes()
                attributes.forEach(async (attribute) => {
                    await consumptionController.attributes.deleteAttribute(attribute)
                })
            })

            after(async function () {
                await testAccount.close()
            })
        })
    }
}
