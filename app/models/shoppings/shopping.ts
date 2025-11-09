import Business from '#models/business/business'
import CostCenter from '#models/cost_centers/cost_center'
import Employee from '#models/employees/employee'
import Provider from '#models/provider/provider'
import Setting from '#models/settings/setting'
import ShoppingProduct from '#models/shoppings/shopping_product'
import User from '#models/users/user'
import Work from '#models/works/work'
import { BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Shopping extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public nro: string

    @column({ columnName: 'business_id' })
    public businessId: number

    @column({ columnName: 'currency_symbol' })
    public currencySymbol: string

    @column({ columnName: 'provider_id' })
    public providerId: number

    @column({ columnName: 'cost_center_id' })
    public costCenterId: number | null

    @column({ columnName: 'work_id' })
    public workId: number | null

    @column()
    public rounding: number

    @column({ columnName: 'requested_by' })
    public requestedBy: string | null

    @column({ columnName: 'payment_term_id' })
    public paymentTermId: number | null

    @column({ columnName: 'send_condition_id' })
    public sendConditionId: number | null

    @column({ columnName: 'send_amount' })
    public sendAmount: number | null

    @column({ columnName: 'other_amount' })
    public otherAmount: number | null

    @column()
    public observation: string | null

    @column({ columnName: 'expire_date' })
    public expireDate: DateTime

    @column({ columnName: 'authorizer_id' })
    public authorizerId: number | null

    @column({ columnName: 'nro_buget' })
    public nroBuget: string | null

    @column()
    public token: string | null

    @column()
    public enabled: boolean

    @column({ columnName: 'is_authorized' })
    public isAuthorized: boolean

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column.dateTime({ columnName: 'deleted_at' })
    public deletedAt: DateTime | null

    @column({ columnName: 'deleted_by' })
    public deletedById: number | null

    @column.dateTime({ columnName: 'authorizer_at' })
    public authorizerAt: DateTime | null

    @belongsTo(() => Business)
    public business: BelongsTo<typeof Business>

    @belongsTo(() => Provider)
    public provider: BelongsTo<typeof Provider>

    @hasMany(() => ShoppingProduct, { foreignKey: 'shoppingId' })
    public products: HasMany<typeof ShoppingProduct>

    @belongsTo(() => CostCenter, { foreignKey: 'costCenterId' })
    public costCenter: BelongsTo<typeof CostCenter>

    @belongsTo(() => Work, { foreignKey: 'workId' })
    public work: BelongsTo<typeof Work>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'deletedById' })
    public deletedBy: BelongsTo<typeof User>

    @belongsTo(() => Employee, { foreignKey: 'authorizerId' })
    public authorizer: BelongsTo<typeof Employee>

    @belongsTo(() => Setting, { foreignKey: 'paymentTermId' })
    public paymentTerm: BelongsTo<typeof Setting>

    @belongsTo(() => Setting, { foreignKey: 'sendConditionId' })
    public sendCondition: BelongsTo<typeof Setting>

    @beforeCreate()
    public static async setDefaults(shopping: Shopping) {
        shopping.enabled = shopping.enabled ?? true
        shopping.isAuthorized = shopping.isAuthorized ?? false
    }

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
