import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId } from "@nmshd/transport"

export interface ICheckPrerequisitesOfIncomingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
}

@type("CheckPrerequisitesOfOutgoingRequestParameters")
export class CheckPrerequisitesOfIncomingRequestParameters
    extends SerializableAsync
    implements ICheckPrerequisitesOfIncomingRequestParameters
{
    @serialize()
    @validate()
    public requestId: CoreId

    public static override async from(
        value: ICheckPrerequisitesOfIncomingRequestParameters
    ): Promise<CheckPrerequisitesOfIncomingRequestParameters> {
        return await super.fromT(value, CheckPrerequisitesOfIncomingRequestParameters)
    }
}
