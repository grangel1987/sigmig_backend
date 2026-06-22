import Buget from '#models/bugets/buget'
import Business from '#models/business/business'
import Client from '#models/clients/client'
import Coin from '#models/coin/coin'
import SalePayment from '#models/sale_payment'
import SaleDetail from '#models/sales/sale_detail'
import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import Shopping from '#models/shoppings/shopping'
import User from '#models/users/user'
import { Google } from '#utils/Google'
import Util from '#utils/Util'
import { afterFetch, afterFind, BaseModel, beforeCreate, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export type SaleStatus = 'paid' | 'unpaid' | 'payment_pending' | 'voided' | 'rejected'
export interface SaleDocument {
    filePath: string
    thumbPath?: string
    contentType: string
    name?: string
    thumbUrl?: string
    fileUrl?: string
}

export default class Sale extends BaseModel {
    public static table = 'sales'

    @column({ isPrimary: true })
    declare id: number

    @column({ columnName: 'business_id' })
    declare businessId: number

    @column({ columnName: 'created_by' })
    declare createdById: number

    @column({ columnName: 'client_id' })
    declare clientId: number | null

    @column({ columnName: 'budget_id' })
    declare budgetId: number | null

    @column({ columnName: 'shopping_id' })
    declare shoppingId: number | null

    @column({ columnName: 'service_entry_sheet_id' })
    declare serviceEntrySheetId: number | null

    @column()
    declare token: string | null

    @column()
    declare title: string | null

    @column()
    declare description: string | null

    @column({ columnName: 'bill_number' })
    declare billNumber: string | null

    @column.date({
        columnName: 'sale_date',
        serialize: (value: DateTime | null) =>
            value ? (typeof value === 'string' ? value : value.toFormat('yyyy-LL-dd')) : null,
    })
    declare saleDate: DateTime | null

    @column()
    declare status: SaleStatus

    @column({
        columnName: 'total_amount',
        prepare: (value?: number) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? null : Number(value),
    })
    declare totalAmount: number | null

    @column({ columnName: 'currency_id' })
    declare currencyId: number | null

    @column({
        columnName: 'document',
        prepare: (value) => (value && typeof value === 'object' ? JSON.stringify(value) : value),
        consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
    })
    declare document: SaleDocument | null

    @column({
        columnName: 'utility',
        prepare: (value?: number | null) => value ?? null,
        consume: (value?: string | number) =>
            value === null || value === undefined ? null : Number(value),
    })
    declare utility: number | null

    @column({
        columnName: 'metadata',
        prepare: (value) => (value && typeof value === 'object' ? JSON.stringify(value) : value),
        consume: (value) => (typeof value === 'string' ? JSON.parse(value) : value),
    })
    declare metadata: Record<string, unknown> | null

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    declare business: BelongsTo<typeof Business>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    declare createdBy: BelongsTo<typeof User>

    @belongsTo(() => Client, { foreignKey: 'clientId' })
    declare client: BelongsTo<typeof Client>

    @belongsTo(() => Buget, { foreignKey: 'budgetId' })
    declare budget: BelongsTo<typeof Buget>

    @belongsTo(() => Shopping, { foreignKey: 'shoppingId' })
    declare shopping: BelongsTo<typeof Shopping>

    @belongsTo(() => ServiceEntrySheet, { foreignKey: 'serviceEntrySheetId' })
    declare serviceEntrySheet: BelongsTo<typeof ServiceEntrySheet>

    @belongsTo(() => Coin, { foreignKey: 'currencyId' })
    declare currency: BelongsTo<typeof Coin>

    @hasMany(() => SaleDetail, { foreignKey: 'saleId' })
    declare details: HasMany<typeof SaleDetail>

    @hasMany(() => SalePayment, { foreignKey: 'saleId' })
    declare payments: HasMany<typeof SalePayment>

    @column.dateTime({ columnName: 'deleted_at' })
    declare deletedAt: DateTime | null

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime

    @beforeCreate()
    public static setToken(sale: Sale) {
        if (!sale.token) sale.token = Util.generateToken(24)
    }

    /**
     * Runs after finding multiple records from the database
     */
    @afterFetch()
    static async getUrls(models: Sale[]) {
        await Promise.all(models.map(async (sale) => {
            if (sale.document) {
                sale.document.fileUrl = await Google.getSignedUrl(sale.document.filePath)
                if (sale.document.thumbPath)
                    sale.document.thumbUrl = await Google.getSignedUrl(sale.document.thumbPath)
            }
        }))
    }
    @afterFind()
    static async getUrl(sale: Sale) {
        if (sale.document) {
            sale.document.fileUrl = await Google.getSignedUrl(sale.document.filePath)
            if (sale.document.thumbPath)
                sale.document.thumbUrl = await Google.getSignedUrl(sale.document.thumbPath)
        }
    }
}
