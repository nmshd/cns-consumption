import { CoreIdHelper } from "@nmshd/transport"

export class ConsumptionIds {
    public static readonly attribute = new CoreIdHelper("CNSATT")
    public static readonly draft = new CoreIdHelper("CNSDRF")
    public static readonly relationshipInfo = new CoreIdHelper("CNSRIN")
    public static readonly sharedItem = new CoreIdHelper("CNSSIT")
    public static readonly response = new CoreIdHelper("CNSRES")
    public static readonly request = new CoreIdHelper("CNSREQ")
    public static readonly setting = new CoreIdHelper("CNSSET")
}
