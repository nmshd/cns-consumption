import { CoreDate, CoreId, SynchronizedCollection, TransportErrors } from "@nmshd/transport"
import { ConsumptionBaseController, ConsumptionControllerName, ConsumptionIds } from "../../consumption"
import { ConsumptionController } from "../../consumption/ConsumptionController"
import { ICreateSettingParameters } from "./local/CreateSettingParameter"
import { Setting, SettingScope } from "./local/Setting"

export class SettingsController extends ConsumptionBaseController {
    private settings: SynchronizedCollection

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.SettingsController, parent)
    }

    public override async init(): Promise<SettingsController> {
        await super.init()

        this.settings = await this.parent.accountController.getSynchronizedCollection("Settings")
        return this
    }

    public async getSetting(id: CoreId): Promise<Setting | undefined> {
        const result = await this.settings.read(id.toString())
        return result ? await Setting.from(result) : undefined
    }

    public async getSettings(query?: any): Promise<Setting[]> {
        const items = await this.settings.find(query)
        return await this.parseArray<Setting>(items, Setting)
    }

    public async createSetting(parameters: ICreateSettingParameters): Promise<Setting> {
        const setting = await Setting.from({
            id: await ConsumptionIds.setting.generate(),
            createdAt: CoreDate.utc(),
            key: parameters.key,
            scope: parameters.scope ?? SettingScope.Identity,
            value: parameters.value,
            reference: parameters.reference,
            succeedsAt: parameters.succeedsAt,
            succeedsItem: parameters.succeedsItem
        })
        await this.settings.create(setting)
        return setting
    }

    public async updateSetting(setting: Setting): Promise<void> {
        const oldSetting = await this.settings.read(setting.id.toString())
        if (!oldSetting) {
            throw TransportErrors.general.recordNotFound(Setting, setting.id.toString()).logWith(this._log)
        }
        await this.settings.update(oldSetting, setting)
    }

    public async deleteSetting(setting: Setting): Promise<void> {
        await this.settings.delete(setting)
    }
}
