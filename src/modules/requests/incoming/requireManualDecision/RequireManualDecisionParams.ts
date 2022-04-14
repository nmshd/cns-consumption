import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"
import { CoreId } from "@nmshd/transport"

export interface IRequireManualDecisionParams extends ISerializableAsync {
    requestId: CoreId
}

export class RequireManualDecisionParams extends SerializableAsync implements IRequireManualDecisionParams {
    @serialize()
    @validate()
    public requestId: CoreId

    public static override async from(value: IRequireManualDecisionParams): Promise<RequireManualDecisionParams> {
        return await super.fromT(value, RequireManualDecisionParams)
    }
}
