import { Attribute, RelationshipCreationChangeRequestBody, RelationshipTemplateBody } from "@nmshd/content"
import { CoreId, Relationship, RelationshipTemplate, TransportErrors } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { SharedItem } from "../sharedItems/local/SharedItem"
import { RelationshipAttribute } from "./local/RelationshipAttribute"
import { RelationshipInfo } from "./local/RelationshipInfo"

export class SingleRelationshipController extends ConsumptionBaseController {
    private _relationship: Relationship
    public get relationship(): Relationship {
        return this._relationship
    }

    private _info: RelationshipInfo
    public get info(): RelationshipInfo {
        return this._info
    }

    private _attributeMap: Map<string, RelationshipAttribute>
    public get attributeMap(): Map<string, RelationshipAttribute> {
        return this._attributeMap
    }

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.SingleRelationshipController, parent)
    }

    public async initWithRelationshipId(id: CoreId): Promise<SingleRelationshipController> {
        const relationship = await this.parent.accountController.relationships.getRelationship(id)
        if (!relationship) {
            throw TransportErrors.general.recordNotFound(Relationship, id.toString()).logWith(this._log)
        }

        return await this.initWithRelationship(relationship)
    }

    public async initWithRelationship(relationship: Relationship): Promise<SingleRelationshipController> {
        await super.init()

        this._relationship = relationship

        const info = await this.parent.relationshipInfo.getRelationshipInfoByRelationship(this.relationship.id)
        if (!info) {
            await this.initialFill()
        } else {
            const attributeMap = new Map<string, RelationshipAttribute>()
            for (const item of info.attributes) {
                attributeMap.set(item.name, item)
            }
            this._attributeMap = attributeMap
            this._info = info
        }

        return this
    }

    private async initialFill(): Promise<SingleRelationshipController> {
        const relationship = await this.parent.accountController.relationships.getRelationship(this._relationship.id)
        if (!relationship) {
            throw TransportErrors.general
                .recordNotFound(Relationship, this._relationship.id.toString())
                .logWith(this._log)
        }

        this._relationship = relationship
        const template = await this.parent.accountController.relationshipTemplates.getRelationshipTemplate(
            relationship.cache!.template.id
        )
        if (!template) {
            throw TransportErrors.general
                .recordNotFound(RelationshipTemplate, relationship.cache!.template.id.toString())
                .logWith(this._log)
        }

        await this.parseTemplateBody(template)
        await this.parseCreationRequest()
        this._info = await this.updateRelationshipInfo()
        return this
    }

    private getTitle(): string {
        let title = this.relationship.peer.address.toString().substring(3, 6)
        const thingname = this.attributeMap.get("Thing.name")?.content.value
        const firstname = this.attributeMap.get("Person.firstname")?.content.value
        const lastname = this.attributeMap.get("Person.lastname")?.content.value
        const gender = this.attributeMap.get("Person.gender")?.content.value
        const orgname = this.attributeMap.get("Organization.name")?.content.value
        const legalname = this.attributeMap.get("Organization.legalname")?.content.value

        if (thingname) {
            title = thingname
        } else if (firstname && lastname) {
            title = `${firstname} ${lastname}`
        } else if (lastname && gender) {
            title = `~~gender.salutation.${gender}~~ ${lastname}`
        } else if (orgname) {
            title = orgname
        } else if (legalname) {
            title = legalname
        }

        return title
    }

    public async updateRelationshipInfo(): Promise<RelationshipInfo> {
        let info = await this.parent.relationshipInfo.getRelationshipInfoByRelationship(this.relationship.id)
        if (!info) {
            const peerAddress = this.relationship.peer.address
            const truncatedAddress = peerAddress.address.substring(3, 6)
            info = await RelationshipInfo.from({
                attributes: [],
                id: await ConsumptionIds.relationshipInfo.generate(),
                isPinned: false,
                relationshipId: this.relationship.id,
                title: truncatedAddress
            })
            info = await this.parent.relationshipInfo.createRelationshipInfo(info)
        }

        const items = await this.parent.sharedItems.getSharedItems({
            sharedBy: this.relationship.peer.address.toString()
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
        this._attributeMap = attributeMap

        info.attributes = attributes

        const title = this.getTitle()
        info.title = title

        await this.parent.relationshipInfo.updateRelationshipInfo(info)
        return info
    }

    private async parseTemplateBody(template: RelationshipTemplate) {
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
                    : this.relationship.peer.address
                const sharedWith = isTemplator
                    ? this.relationship.peer.address
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

    private async parseCreationRequest() {
        const request = this.relationship.cache!.creationChange.request
        if (!request.content) {
            const error = new Error("error.consumption.noRequestContent")
            this._log.error(error)
            throw error
        }
        let isRequestor = false
        if (this.parent.accountController.identity.isMe(request.createdBy)) {
            isRequestor = true
        }
        if (request.content instanceof RelationshipCreationChangeRequestBody) {
            const body = request.content
            const attributes = body.sharedAttributes
            if (attributes) {
                const sharedAt = request.createdAt
                const sharedBy = isRequestor
                    ? this.parent.accountController.identity.address
                    : this.relationship.peer.address
                const sharedWith = isRequestor
                    ? this.relationship.peer.address
                    : this.parent.accountController.identity.address

                for (const attribute of attributes) {
                    const sharedItem = await SharedItem.from({
                        id: await ConsumptionIds.sharedItem.generate(),
                        content: attribute,
                        sharedAt: sharedAt,
                        sharedBy: sharedBy,
                        sharedWith: sharedWith,
                        reference: this.relationship.id,
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
