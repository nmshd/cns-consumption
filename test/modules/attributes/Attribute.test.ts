import {
    ConsumptionController,
    ICreateLocalAttributeParams,
    ICreatePeerLocalAttributeParams,
    ICreateSharedLocalAttributeCopyParams,
    IGetIdentityAttributesParams,
    IGetRelationshipAttributesParams,
    ISucceedLocalAttributeParams,
    LocalAttribute
} from "@nmshd/consumption"
import {
    IdentityAttribute,
    Nationality,
    RelationshipAttribute,
    RelationshipAttributeConfidentiality
} from "@nmshd/content"
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
                const surnameParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Surname",
                            value: "ASurname"
                        },
                        owner: CoreAddress.from("address")
                    })
                }

                const givenNamesParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "GivenName",
                            value: "AGivenName"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                await consumptionController.attributes.createLocalAttribute(surnameParams)
                await consumptionController.attributes.createLocalAttribute(givenNamesParams)
            })

            it("should list all attributes", async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()
                expect(attributes).to.be.of.length(2)
            })

            it("should create new attributes", async function () {
                const attributesBeforeCreate = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesBeforeCreate = attributesBeforeCreate.length

                const addressParams: ICreateLocalAttributeParams = {
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

                const birthDateParams: ICreateLocalAttributeParams = {
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

                const address = await consumptionController.attributes.createLocalAttribute(addressParams)
                expect(address).instanceOf(LocalAttribute)
                expect(address.content).instanceOf(IdentityAttribute)
                const birthDate = await consumptionController.attributes.createLocalAttribute(birthDateParams)
                expect(birthDate).instanceOf(LocalAttribute)
                expect(birthDate.content).instanceOf(IdentityAttribute)

                const attributesAfterCreate = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesAfterCreate = attributesAfterCreate.length
                expect(nrAttributesAfterCreate).equals(nrAttributesBeforeCreate + 2)
            }).timeout(15000)

            it("should delete an attribute", async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesBeforeDelete = attributes.length
                await consumptionController.attributes.deleteAttribute(attributes[0])

                const attributesAfterDelete = await consumptionController.attributes.getLocalAttributes()
                const nrAttributesAfterDelete = attributesAfterDelete.length
                expect(nrAttributesAfterDelete).equals(nrAttributesBeforeDelete - 1)

                const attributesJSON = attributesAfterDelete.map((v) => v.id.toString())
                expect(attributesJSON).not.to.include(attributes[0]?.id.toString())
            })

            it("should succeed attributes", async function () {
                const displayNameParams: ICreateLocalAttributeParams = {
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

                const attribute = await consumptionController.attributes.createLocalAttribute(displayNameParams)
                const createSuccessorParams: ISucceedLocalAttributeParams = {
                    successorContent: displayNameSuccessor,
                    succeeds: attribute.id
                }
                const successor = await consumptionController.attributes.succeedLocalAttribute(createSuccessorParams)
                const succeededAttribute = await consumptionController.attributes.getLocalAttribute(attribute.id)
                expect(succeededAttribute?.content.validTo?.toISOString()).to.equal(
                    successorDate.subtract(1).toISOString()
                )

                const succeessorAttribute = await consumptionController.attributes.getLocalAttribute(successor.id)
                expect(succeessorAttribute?.content.validFrom?.toISOString()).to.equal(successorDate.toISOString())

                const allAttributes = await consumptionController.attributes.getLocalAttributes()
                const allAttributesJSON = allAttributes.map((v) => v.id.toString())
                expect(allAttributesJSON).to.include(succeededAttribute?.id.toString())

                const currentAttributes = consumptionController.attributes.filterCurrent(allAttributes)
                const currentAttributesJSON = currentAttributes.map((v) => v.id.toString())
                expect(currentAttributesJSON).to.not.include(succeededAttribute?.id.toString())
                expect(currentAttributesJSON).to.include(succeessorAttribute?.id.toString())
            })

            it("should allow to create a share attribute copy", async function () {
                const nationalityParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                const nationalityAttribute = await consumptionController.attributes.createLocalAttribute(
                    nationalityParams
                )

                const peer = CoreAddress.from("address")
                const createSharedAttributesParams: ICreateSharedLocalAttributeCopyParams = {
                    attributeId: nationalityAttribute.id,
                    peer: peer,
                    requestReference: CoreId.from("requestId")
                }

                const sharedNationalityAttribute =
                    await consumptionController.attributes.createSharedLocalAttributeCopy(createSharedAttributesParams)
                expect(sharedNationalityAttribute).instanceOf(LocalAttribute)
                expect(sharedNationalityAttribute.shareInfo?.peer).to.deep.equal(peer)
            })

            it("should allow to query relationship attributes", async function () {
                const identityAttributeParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                const identityAttribute = await consumptionController.attributes.createLocalAttribute(
                    identityAttributeParams
                )

                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "nationality",
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address"),
                        confidentiality: "public" as RelationshipAttributeConfidentiality
                    })
                }
                const relationshipAttribute = await consumptionController.attributes.createLocalAttribute(
                    relationshipAttributeParams
                )

                const query: IGetRelationshipAttributesParams = {
                    query: {
                        valueType: "Nationality",
                        key: "nationality",
                        owner: CoreAddress.from("address"),
                        attributeCreationHints: {
                            title: "someHintTitle",
                            confidentiality: "public" as RelationshipAttributeConfidentiality
                        }
                    }
                }

                const attributes = await consumptionController.attributes.executeRelationshipAttributeQuery(query)
                const attributesId = attributes.map((v) => v.id.toString())
                expect(attributesId).to.not.include(identityAttribute.id.toString())
                expect(attributesId).to.include(relationshipAttribute.id.toString())
            })

            it("should allow to query identity attributes", async function () {
                const identityAttributeParams: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                const identityAttribute = await consumptionController.attributes.createLocalAttribute(
                    identityAttributeParams
                )

                const relationshipAttributeParams: ICreateLocalAttributeParams = {
                    content: RelationshipAttribute.from({
                        key: "nationality",
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address"),
                        confidentiality: "public" as RelationshipAttributeConfidentiality
                    })
                }
                const relationshipAttribute = await consumptionController.attributes.createLocalAttribute(
                    relationshipAttributeParams
                )

                const query: IGetIdentityAttributesParams = {
                    query: {
                        valueType: "Nationality"
                    }
                }

                const attributes = await consumptionController.attributes.executeIdentityAttributeQuery(query)
                const attributesId = attributes.map((v) => v.id.toString())
                expect(attributesId).to.not.include(relationshipAttribute.id.toString())
                expect(attributesId).to.include(identityAttribute.id.toString())
            })

            it("should allow to create an attribute shared by a peer", async function () {
                const attribute: ICreateLocalAttributeParams = {
                    content: IdentityAttribute.from({
                        value: {
                            "@type": "Nationality",
                            value: "DE"
                        },
                        owner: CoreAddress.from("address")
                    })
                }
                const localAttribute = await consumptionController.attributes.createLocalAttribute(attribute)
                const createPeerAttributeParams: ICreatePeerLocalAttributeParams = {
                    id: localAttribute.id,
                    content: attribute.content,
                    requestReference: CoreId.from("requestId"),
                    peer: CoreAddress.from("address")
                }
                const peerLocalAttribute = await consumptionController.attributes.createPeerLocalAttribute(
                    createPeerAttributeParams
                )
                expect(peerLocalAttribute.content.toJSON()).deep.equals(localAttribute.content.toJSON())
                expect(peerLocalAttribute.content.value).instanceOf(Nationality)
                expect(createPeerAttributeParams.id).equals(localAttribute.id)
                expect(createPeerAttributeParams.peer.address).equals(CoreAddress.from("address").toString())
                expect(createPeerAttributeParams.requestReference.toString()).equals(
                    CoreId.from("requestId").toString()
                )
            })

            afterEach(async function () {
                const attributes = await consumptionController.attributes.getLocalAttributes()
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
