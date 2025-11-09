import SettingAfp from '#models/afp'
import Business from '#models/business/business'
import Coin from '#models/coin/coin'
import CostCenter from '#models/cost_centers/cost_center'
import Position from '#models/positions/position'
import Setting from '#models/settings/setting'
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
    public afpId: number | null

    @column({ columnName: 'afp2_id' })
    public afp2Id: number | null

    @column({ columnName: 'coin_ahorro_id' })
    public coinAhorroId: number | null

    @column({ columnName: 'ex_regime_id' })
    public exRegimeId: number | null

    @column({ columnName: 'affiliation_id' })
    public affiliationId: number | null

    @column({ columnName: 'layoff_id' })
    public layoffId: number | null

    @column({ columnName: 'isapre_id' })
    public isapreId: number | null

    @column({ columnName: 'load_family_id' })
    public loadFamilyId: number | null

    @column({ columnName: 'health_pact_coin_id' })
    public healthPactCoinId: number | null

    @column({ columnName: 'remuneration_type_id' })
    public remunerationTypeId: number | null

    @column({ columnName: 'legal_gratification_id' })
    public legalGratificationId: number | null

    @column({ columnName: 'bank_id' })
    public bankId: number | null

    @column({ columnName: 'cost_center_id' })
    public costCenterId: number | null

    @column({ columnName: 'position_id' })
    public positionId: number | null

    @column({ columnName: 'business_salary_id' })
    public businessSalaryId: number | null

    @column({ columnName: 'type_account_id' })
    public typeAccountId: number | null

    @column()
    public enabled: boolean

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>

    @belongsTo(() => SettingAfp, { foreignKey: 'afpId' })
    public afp: BelongsTo<typeof SettingAfp>

    @belongsTo(() => SettingAfp, { foreignKey: 'afp2Id' })
    public afp2: BelongsTo<typeof SettingAfp>

    @belongsTo(() => Coin, { foreignKey: 'coinAhorroId' })
    public ahorroCoin: BelongsTo<typeof Coin>

    // exRegimes, affiliation, layoff, isapre, loadFamily likely map to their respective models
    // For now, keep only those with existing models; add the rest as needed

    @belongsTo(() => Setting, { foreignKey: 'remunerationTypeId' })
    public remunerationType: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'bankId' })
    public bank: BelongsTo<typeof Setting>

    @belongsTo(() => CostCenter, { foreignKey: 'costCenterId' })
    public costCenter: BelongsTo<typeof CostCenter>

    @belongsTo(() => Position, { foreignKey: 'positionId' })
    public position: BelongsTo<typeof Position>

    @belongsTo(() => Setting, { foreignKey: 'typeAccountId' })
    public typeAccount: BelongsTo<typeof Setting>

    public static castDates(field: string, value: DateTime) {
        if (['contract_date', 'admission_date', 'settlement_date'].includes(field)) {
            return value.toFormat('dd/MM/yyyy')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
