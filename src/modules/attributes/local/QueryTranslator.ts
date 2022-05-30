import { QueryTranslator } from "@js-soft/docdb-querytranslator"
import {
    AbstractAttributeJSON,
    IdentityAttribute,
    IdentityAttributeJSON,
    IIdentityAttributeQuery,
    IRelationshipAttributeQuery,
    RelationshipAttribute
} from "@nmshd/content"
import { DateTime } from "luxon"
import { nameof } from "ts-simple-nameof"
import { ConsumptionAttribute } from "./ConsumptionAttribute"
import { ConsumptionAttributeShareInfo } from "./ConsumptionAttributeShareInfo"

export const identityQueryTranslator = new QueryTranslator({
    whitelist: {
        [nameof<IIdentityAttributeQuery>((x) => x.tags)]: true,
        [nameof<IIdentityAttributeQuery>((x) => x.valueType)]: true,
        [nameof<IIdentityAttributeQuery>((x) => x.validFrom)]: true,
        [nameof<IIdentityAttributeQuery>((x) => x.validTo)]: true,
        attributeType: true
    },
    alias: {
        // @type of attributeValue
        [nameof<IIdentityAttributeQuery>((x) => x.valueType)]: [
            `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<IdentityAttribute>((x) => x.value)}.@type`
        ],
        // @type of attribute
        attributeType: [`${nameof<ConsumptionAttribute>((x) => x.content)}.@type`]
    },
    custom: {
        // tags
        [nameof<IIdentityAttributeQuery>((x) => x.tags)]: (query: any, input: any) => {
            const allowedTags = []
            for (const tag of input) {
                const tagQuery = {
                    [`${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>(
                        (x) => x.tags
                    )}`]: { $contains: tag }
                }
                allowedTags.push(tagQuery)
            }
            query["$or"] = allowedTags
        },
        // validFrom
        [nameof<IIdentityAttributeQuery>((x) => x.validFrom)]: (query: any, input: any) => {
            if (!input) {
                return
            }
            const validFromUtcString = DateTime.fromISO(input).toUTC().toString()
            query[
                `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`
            ] = {
                $gte: validFromUtcString
            }
        },
        // validTo
        [nameof<IIdentityAttributeQuery>((x) => x.validTo)]: (query: any, input: any) => {
            if (!input) {
                return
            }
            const validToUtcString = DateTime.fromISO(input).toUTC().toString()
            query[
                `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`
            ] = {
                $lte: validToUtcString
            }
        }
    }
})

export const relationshipQueryTranslator = new QueryTranslator({
    whitelist: {
        [nameof<IRelationshipAttributeQuery>((x) => x.key)]: true,
        [nameof<IRelationshipAttributeQuery>((x) => x.valueType)]: true,
        [nameof<IRelationshipAttributeQuery>((x) => x.validFrom)]: true,
        [nameof<IRelationshipAttributeQuery>((x) => x.validTo)]: true,
        [nameof<IRelationshipAttributeQuery>((x) => x.owner)]: true,
        [nameof<IRelationshipAttributeQuery>((x) => x.thirdParty)]: true,
        attributeType: true
    },
    alias: {
        // key
        [nameof<IRelationshipAttributeQuery>((x) => x.key)]: [
            `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.key)}`
        ],
        // @type of attributeValue
        [nameof<IRelationshipAttributeQuery>((x) => x.valueType)]: [
            `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.value)}.@type`
        ],
        // @type of attribute
        attributeType: [`${nameof<ConsumptionAttribute>((x) => x.content)}.@type`],
        // owner
        [nameof<IRelationshipAttributeQuery>((x) => x.owner)]: [
            `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<RelationshipAttribute>((x) => x.owner)}`
        ],
        // peer
        [nameof<IRelationshipAttributeQuery>((x) => x.thirdParty)]: [
            `${nameof<ConsumptionAttribute>((x) => x.shareInfo)}.${nameof<ConsumptionAttributeShareInfo>(
                (x) => x.peer
            )}`
        ]
    },
    custom: {
        // validFrom
        [nameof<IRelationshipAttributeQuery>((x) => x.validFrom)]: (query: any, input: any) => {
            if (!input) {
                return
            }
            const validFromUtcString = DateTime.fromISO(input).toUTC().toString()
            query[
                `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`
            ] = {
                $gte: validFromUtcString
            }
        },
        // validTo
        [nameof<IRelationshipAttributeQuery>((x) => x.validTo)]: (query: any, input: any) => {
            if (!input) {
                return
            }
            const validToUtcString = DateTime.fromISO(input).toUTC().toString()
            query[
                `${nameof<ConsumptionAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`
            ] = {
                $lte: validToUtcString
            }
        }
    }
})
