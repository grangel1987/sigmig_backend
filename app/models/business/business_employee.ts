import SettingAffiliation from '#models/affiliation/setting_affiliation'
import SettingAfp from '#models/afp'
import Business from '#models/business/business'
import Coin from '#models/coin/coin'
import CostCenter from '#models/cost_centers/cost_center'
import Employee from '#models/employees/employee'
import SettingExRegime from '#models/exregime/setting_ex_regime'
import SettingIsapre from '#models/isapre/setting_isapre'
import SettingLayoff from '#models/layoff/setting_layoff'
import SettingLoadFamily from '#models/load_family/setting_load_family'
import Position from '#models/positions/position'
import Setting from '#models/settings/setting'
import SettingTypeContract from '#models/type_contract/setting_type_contract'
import User from '#models/users/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessEmployee extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column({ columnName: 'business_id' })
    public businessId: number

    @column({ columnName: 'afp_id' })
    public afpId: number

    @column({ columnName: 'afp_percentage' })
    public afpPercentage: number

    @column({ columnName: 'ex_regime_id' })
    public exRegimeId: number

    @column({ columnName: 'afp2_id' })
    public afp2Id: number

    @column({ columnName: 'afp2_ahorro' })
    public afp2Ahorro: number

    @column({ columnName: 'coin_ahorro_id' })
    public coinAhorroId: number

    @column({ columnName: 'type_contract_id' })
    public typeContractId: number

    @column({ columnName: 'affiliation_id' })
    public affiliationId: number

    @column({ columnName: 'layoff_id' })
    public layoffId: number

    @column({ columnName: 'isapre_id' })
    public isapreId: number

    @column({ columnName: 'load_family_id' })
    public loadFamilyId: number

    @column({ columnName: 'load_family_normal' })
    public loadFamilyNormal: number

    @column({ columnName: 'load_family_invalidate' })
    public loadFamilyInvalidate: number

    @column({ columnName: 'weekly_shift_hours' })
    public weeklyShiftHours: number

    @column({ columnName: 'view_liquidation' })
    public viewLiquidation: boolean

    @column({ columnName: 'health_pact_value' })
    public healthPactValue: number

    @column({ columnName: 'health_pact_coin_id' })
    public healthPactCoinId: number

    @column({ columnName: 'mount_pact' })
    public mountPact: number

    @column({ columnName: 'additional_pact' })
    public additionalPact: number

    @column({ columnName: 'remuneration_type_id' })
    public remunerationTypeId: number

    @column({ columnName: 'remuneration_amount' })
    public remunerationAmount: number

    @column({ columnName: 'legal_gratification_id' })
    public legalGratificationId: number

    @column({ columnName: 'bank_id' })
    public bankId: number

    @column({ columnName: 'type_account_id' })
    public typeAccountId: number

    @column({ columnName: 'nro_account' })
    public nroAccount: string | null

    @column({ columnName: 'owner' })
    public owner: string | null

    @column({ columnName: 'zone_bonus' })
    public zoneBonus: number

    @column({ columnName: 'snacks_bonus' })
    public snacksBonus: number

    @column({ columnName: 'mobilizations_bonus' })
    public mobilizationsBonus: number

    @column({ columnName: 'business_salary_id' })
    public businessSalaryId: number

    @column({ columnName: 'quote_sis' })
    public quoteSis: boolean

    @column({ columnName: 'cost_center_id' })
    public costCenterId: number

    @column({ columnName: 'position_id' })
    public positionId: number

    @column.date({ columnName: 'admission_date' })
    public admissionDate: DateTime | null

    @column.date({ columnName: 'contract_date' })
    public contractDate: DateTime | null

    @column.date({ columnName: 'settlement_date' })
    public settlementDate: DateTime | null

    @column()
    public enabled: boolean

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ columnName: 'inactive_at' })
    public inactiveAt: DateTime | null

    @column({ columnName: 'inactive_by' })
    public inactiveBy: number | null

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Employee)
    declare employee: BelongsTo<typeof Employee>

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>

    @belongsTo(() => SettingAfp, { foreignKey: 'afpId' })
    public afp: BelongsTo<typeof SettingAfp>

    @belongsTo(() => SettingAfp, { foreignKey: 'afp2Id' })
    public afp2: BelongsTo<typeof SettingAfp>

    @belongsTo(() => Coin, { foreignKey: 'coinAhorroId' })
    public ahorroCoin: BelongsTo<typeof Coin>

    @belongsTo(() => Coin, { foreignKey: 'healthPactCoinId' })
    public healthPactCoin: BelongsTo<typeof Coin>

    @belongsTo(() => SettingExRegime, { foreignKey: 'exRegimeId' })
    public exRegime: BelongsTo<typeof SettingExRegime>

    @belongsTo(() => SettingTypeContract, { foreignKey: 'typeContractId' })
    public typeContract: BelongsTo<typeof SettingTypeContract>

    @belongsTo(() => SettingAffiliation, { foreignKey: 'affiliationId' })
    public affiliation: BelongsTo<typeof SettingAffiliation>

    @belongsTo(() => SettingLayoff, { foreignKey: 'layoffId' })
    public layoff: BelongsTo<typeof SettingLayoff>

    @belongsTo(() => SettingIsapre, { foreignKey: 'isapreId' })
    public isapre: BelongsTo<typeof SettingIsapre>

    @belongsTo(() => SettingLoadFamily, { foreignKey: 'loadFamilyId' })
    public loadFamily: BelongsTo<typeof SettingLoadFamily>

    @belongsTo(() => Setting, { foreignKey: 'remunerationTypeId' })
    public remunerationType: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'legalGratificationId' })
    public legalGratification: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'bankId' })
    public bank: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'typeAccountId' })
    public typeAccount: BelongsTo<typeof Setting>

    @belongsTo(() => CostCenter, { foreignKey: 'costCenterId' })
    public costCenter: BelongsTo<typeof CostCenter>

    // Added missing relation to expose businessSalary Setting record
    @belongsTo(() => Setting, { foreignKey: 'businessSalaryId' })
    public businessSalary: BelongsTo<typeof Setting>

    @belongsTo(() => Position, { foreignKey: 'positionId' })
    public position: BelongsTo<typeof Position>

    @belongsTo(() => User, { foreignKey: 'inactiveBy' })
    public inactiveByUser: BelongsTo<typeof User>


    serializeExtras() {
        const emp = this.employee
        const last_name_m = emp ? emp.lastNameM : this.$extras.last_name_m
        const last_name_p = emp ? emp.lastNameP : this.$extras.last_name_p
        const names = emp ? emp.names : this.$extras.names

        const full_name = `${names || ''} ${last_name_p || ''} ${last_name_m || ''}`.trim()
        return {
            names: names,
            last_name_p: last_name_p,
            last_name_m: last_name_m,
            full_name
        }
    }

    public static castDates(field: string, value: DateTime) {
        if (['contract_date', 'admission_date', 'settlement_date'].includes(field)) {
            return value.toFormat('dd/MM/yyyy')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
