import { ISerializableAsync, SerializableAsync, serialize, type, validate } from "@js-soft/ts-serval"
import { CoreId, ICoreId } from "@nmshd/transport"

export interface ICheckPrerequisitesOfOutgoingRequestParameters extends ISerializableAsync {
    requestId: ICoreId
}

@type("CheckPrerequisitesOfOutgoingRequestParameters")
export class CheckPrerequisitesOfOutgoingRequestParameters
    extends SerializableAsync
    implements ICheckPrerequisitesOfOutgoingRequestParameters
{
    @serialize()
    @validate()
    public requestId: CoreId

    public static override async from(
        value: ICheckPrerequisitesOfOutgoingRequestParameters
    ): Promise<CheckPrerequisitesOfOutgoingRequestParameters> {
        return await super.fromT(value, CheckPrerequisitesOfOutgoingRequestParameters)
    }
}