// import {
//     Attribute,
//     IRelationshipCreationChangeRequestBody,
//     IRelationshipTemplateBody,
//     RelationshipCreationChangeRequestBody,
//     RelationshipTemplateBody
// } from "@nmshd/content"
// import { CoreId, RelationshipTemplate } from "@nmshd/transport"
// import {
//     ConsumptionBaseController,
//     ConsumptionControllerName,
//     ConsumptionErrors,
//     ConsumptionIds
// } from "../../consumption"
// import { ConsumptionController } from "../../consumption/ConsumptionController"

// export class OnboardingFlowController extends ConsumptionBaseController {
//     public constructor(parent: ConsumptionController) {
//         super(ConsumptionControllerName.OnboardingFlowController, parent)
//     }

//     public async init(): Promise<OnboardingFlowController> {
//         await super.init()

//         return this
//     }

//     public async createTemplateBody(
//         body: IRelationshipTemplateBody,
//         shareAttributeNames?: string[]
//     ): Promise<RelationshipTemplateBody> {
//         const templateBody = await RelationshipTemplateBody.from(body)
//         const attributes = []
//         if (shareAttributeNames) {
//             for (const attributeName of shareAttributeNames) {
//                 const consumptionAttribute = await this.parent.attributes.getAttributeByName(attributeName)
//                 if (!consumptionAttribute) {
//                     throw ConsumptionErrors.onboarding.attributeNotSet(attributeName)
//                 }
//                 attributes.push(consumptionAttribute.content)
//             }
//         }

//         templateBody.sharedAttributes = attributes

//         return templateBody
//     }

//     public async createRequestBody(
//         template: RelationshipTemplate,
//         acceptRequestIds?: CoreId[]
//     ): Promise<RelationshipCreationChangeRequestBody> {
//         const templateBody = template.cache!.content
//         if (!(templateBody instanceof RelationshipTemplateBody)) {
//             throw ConsumptionErrors.onboarding.wrongTemplate().logWith(this._log)
//         }
//         const responses = []
//         if (templateBody.requestedAttributes) {
//             for (const attributeRequest of templateBody.requestedAttributes) {
//                 if (attributeRequest.required) {
//                     // Accept attributeRequest

//                     const attributes: Attribute[] = []
//                     for (const attributeName of attributeRequest.names) {
//                         const attribute = await this.parent.attributes.getAttributeByName(attributeName)
//                         if (!attribute) {
//                             throw ConsumptionErrors.onboarding.attributeNotSet(attributeName).logWith(this._log)
//                         }
//                         attributes.push(attribute.content)
//                     }

//                     const response = {
//                         responseId: await ConsumptionIds.response.generate(),
//                         requestId: attributeRequest.id,
//                         key: attributeRequest.key,
//                         attributes: attributes
//                     }
//                     responses.push(response)
//                     await this.parent.requests.acceptRequest(attributeRequest.id!, template.id)
//                 } else if (attributeRequest.id && acceptRequestIds?.includes(attributeRequest.id)) {
//                     // Accept attributeRequest

//                     const attributes: Attribute[] = []
//                     for (const attributeName of attributeRequest.names) {
//                         const attribute = await this.parent.attributes.getAttributeByName(attributeName)
//                         if (!attribute) {
//                             throw ConsumptionErrors.onboarding.attributeNotSet(attributeName).logWith(this._log)
//                         }
//                         attributes.push(attribute.content)
//                     }

//                     const response = {
//                         responseId: await ConsumptionIds.response.generate(),
//                         requestId: attributeRequest.id,
//                         key: attributeRequest.key,
//                         attributes: attributes
//                     }

//                     responses.push(response)
//                     await this.parent.requests.acceptRequest(attributeRequest.id, template.id)
//                 } else {
//                     await this.parent.requests.rejectRequest(attributeRequest.id!, template.id)
//                 }
//             }
//         }

//         // TODO: JSSNMSHDD-2496 (add responses + content response)

//         const creationChangeBody: IRelationshipCreationChangeRequestBody = {
//             metadata: templateBody.metadata
//         }
//         return await RelationshipCreationChangeRequestBody.from(creationChangeBody)
//     }
// }
