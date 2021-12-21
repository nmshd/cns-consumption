import { Attribute, RelationshipCreationChangeRequestBody, RelationshipTemplateBody } from "@nmshd/content"
import { AccountController, RelationshipTemplate, Transport } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest } from "../../core/AbstractTest"
import { TestUtil } from "../../core/TestUtil"

export class RelationshipRequestorTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RelationshipRequestor", function () {
            const transport = new Transport(that.connection, that.config, that.loggerFactory)
            this.timeout(200000)

            let requestor: AccountController
            let templator: AccountController

            let tokenref: string
            let template: RelationshipTemplate
            let templateBody: RelationshipTemplateBody
            let requestBody: RelationshipCreationChangeRequestBody

            before(async function () {
                await TestUtil.clearAccounts(that.connection)

                await transport.init()

                const accounts: AccountController[] = await TestUtil.provideAccounts(transport, 2)

                templator = accounts[0]
                requestor = accounts[1]
            })

            it("should create a valid RelationshipTemplate with body", async function () {
                const body = await RelationshipTemplateBody.from({
                    sharedAttributes: [
                        { name: "Person.firstname", value: "Hugo" },
                        { name: "Person.lastname", value: "Becker" }
                    ],
                    requestedAttributes: [
                        { names: ["Person.firstname", "Person.lastname"], required: true },
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
                        { name: "Person.firstname", value: "Martha" },
                        { name: "Person.lastname", value: "Huber" }
                    ],
                    sessionIdentifier: templateBody.sessionIdentifier,
                    title: "Kontaktanfrage"
                })
                const relationship = await TestUtil.sendRelationship(requestor, template, requestBody)
                expect(relationship).to.exist
            })

            after(async function () {
                await templator.close()
                await requestor.close()
            })
        })
    }
}
