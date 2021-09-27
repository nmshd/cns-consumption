import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"

export interface ICreateTemplateBodyParams extends ISerializableAsync {
    shareAttributeNames?: string[]
    requestRequiredAttributes?: string[]
    requestOptionalAttributes?: string[]
}

export class CreateTemplateBodyParams extends SerializableAsync implements ICreateTemplateBodyParams {
    @serialize({ type: String })
    @validate({ nullable: true })
    public shareAttributeNames: string[]

    @serialize({ type: String })
    @validate({ nullable: true })
    public requestRequiredAttributes: string[]

    @serialize({ type: String })
    @validate({ nullable: true })
    public requestOptionalAttributes: string[]

    public static async from(value: ICreateTemplateBodyParams): Promise<CreateTemplateBodyParams> {
        return await super.fromT(value, CreateTemplateBodyParams)
    }
}
