import { ILogger } from "@js-soft/logging-abstractions"
import { Attribute, RelationshipCreationChangeRequestBody, RelationshipTemplateBody } from "@nmshd/content"
import { CoreId, Relationship, RelationshipTemplate, TransportErrors, TransportLoggerFactory } from "@nmshd/transport"
import { ConsumptionIds } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { SharedItem } from "../sharedItems/local/SharedItem"
import { RelationshipAttribute } from "./local/RelationshipAttribute"
import { RelationshipInfo } from "./local/RelationshipInfo"

export class RelationshipInfoUtil {
    protected _log: ILogger
    public get log(): ILogger {
        return this._log
    }

    public constructor(private readonly parent: ConsumptionController) {
        this._log = TransportLoggerFactory.getLogger(RelationshipInfoUtil)
    }

    public async createInitialRelationshipInfo(id: CoreId): Promise<RelationshipInfo> {
        const relationship = await this.parent.accountController.relationships.getRelationship(id)
        if (!relationship) {
            throw TransportErrors.general.recordNotFound(Relationship, id.toString()).logWith(this._log)
        }

        const template = await this.parent.accountController.relationshipTemplates.getRelationshipTemplate(
            relationship.cache!.template.id
        )
        if (!template) {
            throw TransportErrors.general
                .recordNotFound(RelationshipTemplate, relationship.cache!.template.id.toString())
                .logWith(this._log)
        }

        await this.parseTemplateBody(relationship, template)
        await this.parseCreationRequest(relationship)

        return await this.createRelationshipInfo(relationship)
    }

    private getTitle(relationship: Relationship, attributeMap: Map<string, RelationshipAttribute>): string {
        let title = relationship.peer.address.toString().substring(3, 9)

        const thingName = attributeMap.get("Thing.name")?.content.value
        const givenName = attributeMap.get("Person.givenName")?.content.value
        const familyName = attributeMap.get("Person.familyName")?.content.value
        const gender = attributeMap.get("Person.gender")?.content.value
        const orgname = attributeMap.get("Organization.name")?.content.value
        const legalName = attributeMap.get("Organization.legalname")?.content.value

        if (thingName) {
            title = thingName
        } else if (givenName && familyName) {
            title = `${givenName} ${familyName}`
        } else if (givenName) {
            title = givenName
        } else if (familyName && gender) {
            title = `i18n://salutation.gender.${gender} ${familyName}`
        } else if (orgname) {
            title = orgname
        } else if (legalName) {
            title = legalName
        }

        return title
    }

    private async createRelationshipInfo(relationship: Relationship): Promise<RelationshipInfo> {
        const peerAddress = relationship.peer.address
        const truncatedAddress = peerAddress.address.substring(3, 9)
        let info = await RelationshipInfo.from({
            attributes: [],
            id: await ConsumptionIds.relationshipInfo.generate(),
            isPinned: false,
            relationshipId: relationship.id,
            title: truncatedAddress
        })
        info = await this.parent.relationshipInfo.createRelationshipInfo(info)

        const items = await this.parent.sharedItems.getSharedItems({
            sharedBy: relationship.peer.address.toString()
        })
        const attributes = []
        const attributeMap = new Map<string, RelationshipAttribute>()
        for (const item of items) {
            if (item.content instanceof Attribute) {
                const relAttr = await RelationshipAttribute.from({
                    name: item.content.name,
                    sharedItem: item.id,
                    content: item.content
                })
                attributes.push(relAttr)
                attributeMap.set(relAttr.name, relAttr)
            }
        }

        info.attributes = attributes

        const title = this.getTitle(relationship, attributeMap)
        info.title = title

        await this.parent.relationshipInfo.updateRelationshipInfo(info)
        return info
    }

    private async parseTemplateBody(relationship: Relationship, template: RelationshipTemplate) {
        if (!template.cache) {
            throw TransportErrors.general.cacheEmpty(RelationshipTemplate, template.id.toString()).logWith(this._log)
        }

        const isTemplator = this.parent.accountController.identity.isMe(template.cache.createdBy)
        if (template.cache.content instanceof RelationshipTemplateBody) {
            const body = template.cache.content
            const attributes = body.sharedAttributes
            if (attributes) {
                const sharedAt = template.cache.createdAt
                const sharedBy = isTemplator
                    ? this.parent.accountController.identity.address
                    : relationship.peer.address
                const sharedWith = isTemplator
                    ? relationship.peer.address
                    : this.parent.accountController.identity.address

                for (const attribute of attributes) {
                    const sharedItem = await SharedItem.from({
                        id: await ConsumptionIds.sharedItem.generate(),
                        content: attribute,
                        sharedAt: sharedAt,
                        sharedBy: sharedBy,
                        sharedWith: sharedWith,
                        reference: template.id,
                        expiresAt: attribute.validTo
                    })
                    await this.parent.sharedItems.createSharedItem(sharedItem)
                }
            }
        }
    }

    private async parseCreationRequest(relationship: Relationship) {
        const request = relationship.cache!.creationChange.request
        if (!request.content) {
            const error = new Error("error.consumption.noRequestContent")
            this._log.error(error)
            throw error
        }
        const isRequestor = this.parent.accountController.identity.isMe(request.createdBy)
        if (request.content instanceof RelationshipCreationChangeRequestBody) {
            const body = request.content
            const attributes = body.sharedAttributes
            if (attributes) {
                const sharedAt = request.createdAt
                const sharedBy = isRequestor
                    ? this.parent.accountController.identity.address
                    : relationship.peer.address
                const sharedWith = isRequestor
                    ? relationship.peer.address
                    : this.parent.accountController.identity.address

                for (const attribute of attributes) {
                    const sharedItem = await SharedItem.from({
                        id: await ConsumptionIds.sharedItem.generate(),
                        content: attribute,
                        sharedAt: sharedAt,
                        sharedBy: sharedBy,
                        sharedWith: sharedWith,
                        reference: relationship.id,
                        expiresAt: attribute.validTo
                    })
                    await this.parent.sharedItems.createSharedItem(sharedItem)
                }
            }
        } else {
            throw new Error("Request.content.content is no RelationshipCreationChangeRequestBody")
        }
    }
}
