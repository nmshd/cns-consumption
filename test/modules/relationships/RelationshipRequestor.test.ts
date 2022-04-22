import { ConsumptionController, RelationshipInfo, SharedItem } from "@nmshd/consumption"
import { Attribute, RelationshipCreationChangeRequestBody, RelationshipTemplateBody } from "@nmshd/content"
import { AccountController, Relationship, RelationshipTemplate, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { IntegrationTest } from "../../core/IntegrationTest"
import { TestUtil } from "../../core/TestUtil"

export class RelationshipRequestorTest extends IntegrationTest {
    public run(): void {
        const that = this

        describe("RelationshipRequestor", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)
            this.timeout(200000)

            let requestor: AccountController
            let requestorConsumption: ConsumptionController
            let templator: AccountController
            let relationship: Relationship

            let tokenref: string
            let template: RelationshipTemplate
            let templateBody: RelationshipTemplateBody
            let requestBody: RelationshipCreationChangeRequestBody

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts = await TestUtil.provideAccounts(transport, 2)

                ;({ accountController: requestor, consumptionController: requestorConsumption } = accounts[0])
                ;({ accountController: templator } = accounts[1])
            })

            it("should create a valid RelationshipTemplate with body", async function () {
                const body = await RelationshipTemplateBody.from({
                    sharedAttributes: [
                        { name: "Person.givenName", value: "Hugo" },
                        { name: "Person.familyName", value: "Becker" }
                    ],
                    requestedAttributes: [
                        { names: ["Person.givenName", "Person.familyName"], required: true },
                        { names: ["Comm.phone"], reason: "Damit wir Sie kontaktieren können." }
                    ],
                    sessionIdentifier: "sessionid",
                    title: "Kontaktanfrage"
                })
                tokenref = await TestUtil.sendRelationshipTemplateAndToken(templator, body)
                expect(tokenref).to.exist
            })

            it("should fetch the RelationshipTemplate with body", async function () {
                template = await TestUtil.fetchRelationshipTemplateFromTokenReference(requestor, tokenref)
                expect(template).instanceOf(RelationshipTemplate)
                templateBody = template.cache?.content as RelationshipTemplateBody
                expect(templateBody).instanceOf(RelationshipTemplateBody)
                expect(templateBody.metadata).to.not.exist
                expect(templateBody.title).equals("Kontaktanfrage")
                expect(templateBody.sessionIdentifier).equals("sessionid")
                expect(templateBody.sharedAttributes).lengthOf(2)
                expect(templateBody.sharedAttributes![0]).instanceOf(Attribute)
                expect(templateBody.sharedAttributes![0].value).equals("Hugo")
                expect(templateBody.sharedAttributes![1]).instanceOf(Attribute)
                expect(templateBody.sharedAttributes![1].value).equals("Becker")
            })

            it("should create a valid Creation Request with body", async function () {
                requestBody = await RelationshipCreationChangeRequestBody.from({
                    sharedAttributes: [
                        { name: "Person.givenName", value: "Martha" },
                        { name: "Person.familyName", value: "Huber" }
                    ],
                    sessionIdentifier: templateBody.sessionIdentifier,
                    title: "Kontaktanfrage"
                })
                relationship = await TestUtil.sendRelationship(requestor, template, requestBody)
                expect(relationship).to.exist
            })

            it("should store the corresponding relationshipInfo", async function () {
                const relationshipInfo = await requestorConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship.id
                )
                expect(relationshipInfo).instanceOf(RelationshipInfo)
                expect(relationshipInfo!.relationshipId.toString()).equals(relationship.id.toString())
                expect(relationshipInfo!.title).equals("Hugo Becker")
            })

            it("should store the received attributes", async function () {
                const receivedItems = await requestorConsumption.sharedItems.getSharedItems({
                    sharedBy: relationship.peer.address.toString()
                })
                const creationDate = relationship.cache!.creationChange.request.createdAt
                const selfAddress = requestor.identity.address.toString()
                expect(receivedItems).lengthOf(2)

                const attributes: Record<string, Attribute | undefined> = {}
                for (const item of receivedItems) {
                    expect(item).instanceOf(SharedItem)
                    expect(item.reference!.toString()).equals(template.id.toString())
                    expect(item.sharedAt.isWithin({ seconds: 5 }, { seconds: 5 }, creationDate)).equals(true)
                    expect(item.sharedBy.toString()).equals(relationship.peer.address.toString())
                    expect(item.sharedWith.toString()).equals(selfAddress)
                    expect(item.content).instanceOf(Attribute)
                    const attribute = item.content as Attribute
                    attributes[attribute.name] = attribute
                }

                let found = 0
                for (const templateItem of templateBody.sharedAttributes!) {
                    if (attributes[templateItem.name]) {
                        const attribute = attributes[templateItem.name]!
                        found++
                        expect(attribute.name).equals(templateItem.name)
                        expect(attribute.value).equals(templateItem.value)
                    }
                }
                expect(found).equals(templateBody.sharedAttributes!.length)
            })

            it("should store the sent attributes", async function () {
                const sentItems = await requestorConsumption.sharedItems.getSharedItems({
                    sharedWith: relationship.peer.address.toString()
                })
                const change = relationship.cache!.creationChange
                const creationDate = change.request.createdAt
                const selfAddress = requestor.identity.address.toString()
                expect(sentItems).lengthOf(2)

                const attributes: Record<string, Attribute | undefined> = {}
                for (const item of sentItems) {
                    expect(item).instanceOf(SharedItem)
                    expect(item.reference!.toString()).equals(change.id.toString())
                    expect(item.sharedAt.isWithin({ seconds: 5 }, { seconds: 5 }, creationDate)).equals(true)
                    expect(item.sharedBy.toString()).equals(selfAddress)
                    expect(item.sharedWith.toString()).equals(relationship.peer.address.toString())
                    expect(item.content).instanceOf(Attribute)
                    const attribute = item.content as Attribute
                    attributes[attribute.name] = attribute
                }

                let found = 0
                const requestBody = change.request.content as RelationshipCreationChangeRequestBody
                for (const templateItem of requestBody.sharedAttributes!) {
                    if (attributes[templateItem.name]) {
                        const attribute = attributes[templateItem.name]!
                        found++
                        expect(attribute.name).equals(templateItem.name)
                        expect(attribute.value).equals(templateItem.value)
                    }
                }
                expect(found).equals(requestBody.sharedAttributes!.length)
            })

            it("should check for duplicates within sharedItems", async function () {
                const relationshipInfo = await requestorConsumption.relationshipInfo.getRelationshipInfoByRelationship(
                    relationship.id
                )
                expect(relationshipInfo).instanceOf(RelationshipInfo)
                expect(relationshipInfo!.relationshipId.toString()).equals(relationship.id.toString())
                expect(relationshipInfo!.title).equals("Hugo Becker")

                const templateItems = await requestorConsumption.sharedItems.getSharedItems({
                    reference: template.id.toString()
                })
                expect(templateItems).length(2)

                const requestItems = await requestorConsumption.sharedItems.getSharedItems({
                    reference: template.id.toString()
                })
                expect(requestItems).length(2)
            })

            after(async function () {
                await templator.close()
                await requestor.close()
            })
        })
    }
}
