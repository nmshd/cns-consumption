import { CoreIdHelper } from "@nmshd/transport"

export class ConsumptionIds {
    public static readonly attribute = new CoreIdHelper("ATT")
    public static readonly draft = new CoreIdHelper("DRF")
    public static readonly request = new CoreIdHelper("REQ")
    public static readonly setting = new CoreIdHelper("SET")
}
