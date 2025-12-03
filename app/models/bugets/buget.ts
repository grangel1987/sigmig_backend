import BugetAccount from '#models/bugets/buget_account'
import BugetDetail from '#models/bugets/buget_detail'
import BugetItem from '#models/bugets/buget_item'
import BugetProduct from '#models/bugets/buget_product'
import Business from '#models/business/business'
import Client from '#models/clients/client'
import User from '#models/users/user'
import Util from '#utils/Util'
import { BaseModel, beforeCreate, beforeFetch, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Buget extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public nro: string

    @column({ columnName: 'business_id' })
    public businessId: number | null

    @column({ columnName: 'client_id' })
    public clientId: number | null

    @column()
    declare token: string | null

    @column({ columnName: 'currency_id' })
    public currencyId: number | null

    @column({ columnName: 'currency_symbol' })
    public currencySymbol: string | null

    @column({ columnName: 'currency_value', serialize: (value: number | null) => Util.truncateToTwoDecimals(value) })
    public currencyValue: number | null

    @column({ serialize: (value: number) => Util.truncateToTwoDecimals(value) })
    public utility: number

    @column({ serialize: (value: number) => Util.truncateToTwoDecimals(value) })
    public discount: number

    @column()
    public enabled: boolean

    @column()
    public prevId: number | null

    @column.dateTime({ serialize: (value: DateTime) => value?.toFormat('yyyy/LL/dd') })
    public createdAt: DateTime

    @column.dateTime({ serialize: (value: DateTime) => value?.toFormat('yyyy/LL/dd') })
    public updatedAt: DateTime

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ columnName: 'expire_date', serialize: (value: DateTime) => value?.toFormat('dd/MM/yyyy') })
    public expireDate: DateTime

    @column.dateTime({ columnName: 'deleted_at', serialize: (value: DateTime) => value?.toFormat('dd/MM/yyyy') })
    public deletedAt: DateTime | null

    @column({ columnName: 'deleted_by' })
    public deletedById: number | null

    @beforeCreate()
    public static setDefaults(model: Buget) {
        if (model.enabled === undefined) model.enabled = true
    }

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>

    @belongsTo(() => Client, { foreignKey: 'clientId' })
    public client: BelongsTo<typeof Client>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'deletedById' })
    public deletedBy: BelongsTo<typeof User>

    @hasMany(() => BugetProduct, { foreignKey: 'bugetId' })
    public products: HasMany<typeof BugetProduct>

    @hasMany(() => BugetItem, { foreignKey: 'bugetId' })
    public items: HasMany<typeof BugetItem>

    @hasMany(() => BugetAccount, { foreignKey: 'bugetId' })
    public banks: HasMany<typeof BugetAccount>

    @hasOne(() => BugetDetail, { foreignKey: 'bugetId' })
    public details: HasOne<typeof BugetDetail>


    /**
     * Runs before creating a new record
     */
    @beforeCreate()
    public static async setToken(bdt: Buget) {

        if (!bdt.token) bdt.token = Util.generateToken(16)

    }


    @beforeFetch()
    public static hookName(query: ModelQueryBuilderContract<typeof Buget>) {
        query.where('bugets.enabled', true).whereNotNull('bugets.token')
    }

    public static castDates(field: string, value: DateTime) {
        if (field === 'expire_date') return value.toFormat('yyyy-MM-dd')
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
