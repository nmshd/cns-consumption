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

                ;({ accountController: requestor } = accounts[0])
                ;({ accountController: templator } = accounts[1])
            })

            it("should create a valid RelationshipTemplate with body", async function () {
                const body = RelationshipTemplateBody.from({
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
                requestBody = RelationshipCreationChangeRequestBody.from({
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

            after(async function () {
                await templator.close()
                await requestor.close()
            })
        })
    }
}
