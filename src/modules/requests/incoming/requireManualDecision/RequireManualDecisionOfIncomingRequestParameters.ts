import { ISerializableAsync, SerializableAsync, serialize, validate } from "@js-soft/ts-serval"
import { CoreId } from "@nmshd/transport"

export interface IRequireManualDecisionOfIncomingRequestParameters extends ISerializableAsync {
    requestId: CoreId
}

export class RequireManualDecisionOfIncomingRequestParameters
    extends SerializableAsync
    implements IRequireManualDecisionOfIncomingRequestParameters
{
    @serialize()
    @validate()
    public requestId: CoreId

    public static override async from(
        value: IRequireManualDecisionOfIncomingRequestParameters
    ): Promise<RequireManualDecisionOfIncomingRequestParameters> {
        return await super.fromT(value, RequireManualDecisionOfIncomingRequestParameters)
    }
}
