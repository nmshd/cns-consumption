import { ServalBuildInformation } from "@js-soft/ts-serval"
import { ContentBuildInformation } from "@nmshd/content"
import { CryptoBuildInformation } from "@nmshd/crypto"
import { TransportBuildInformation } from "@nmshd/transport"

export class ConsumptionBuildInformation {
    public readonly version: string = "{{version}}"
    public readonly build: string = "{{build}}"
    public readonly date: string = "{{date}}"
    public readonly commit: string = "{{commit}}"
    public readonly dependencies: object

    public readonly transport = TransportBuildInformation.info
    public readonly crypto = CryptoBuildInformation.info
    public readonly serval = ServalBuildInformation.info
    public readonly content = ContentBuildInformation.info

    private constructor() {
        try {
            // eslint-disable-next-line @typescript-eslint/quotes
            this.dependencies = JSON.parse(`{{dependencies}}`)
        } catch (e) {
            this.dependencies = {}
        }
    }

    public static readonly info: ConsumptionBuildInformation = new ConsumptionBuildInformation()
}
