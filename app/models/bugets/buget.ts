import BudgetPayment from '#models/budget_payment'
import BudgetObservation from '#models/bugets/budget_observation'
import BugetAccount from '#models/bugets/buget_account'
import BugetDetail from '#models/bugets/buget_detail'
import BugetItem from '#models/bugets/buget_item'
import BugetProduct from '#models/bugets/buget_product'
import Business from '#models/business/business'
import Client from '#models/clients/client'
import CostCenter from '#models/cost_centers/cost_center'
import User from '#models/users/user'
import Work from '#models/works/work'
import CurrencyConversionService from '#services/currency_conversion_service'
import Util from '#utils/Util'
import {
  BaseModel,
  beforeCreate,
  beforeFetch,
  belongsTo,
  column,
  hasMany,
  hasOne,
} from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Buget extends BaseModel {
  public static table = 'bugets'

  @column({ isPrimary: true })
  public id: number

  @column()
  public nro: string

  @column({ columnName: 'business_id' })
  public businessId: number

  @column({ columnName: 'client_id' })
  public clientId: number

  @column({ columnName: 'cost_center_id' })
  public costCenterId: number | null

  @column({ columnName: 'work_id' })
  public workId: number | null

  @column({
    consume: v => typeof v === 'string' ? JSON.parse(v) : v,
    prepare: v => typeof v === 'object' ? JSON.stringify(v) : v
  })
  public info: {
    name?: string
    email?: string
    paymentTerm?: number
    sendCondition?: number
    sendAmount?: number
    otherAmount?: number
    observation?: string
    daysExpireBuget?: number
    authorizerId?: number
    nroBuget?: string
  } | null

  @column()
  declare token: string

  @column({ columnName: 'currency_id' })
  public currencyId: number

  @column({ columnName: 'currency_symbol' })
  public currencySymbol: string

  @column({
    columnName: 'currency_value',
    serialize: (value: number) => Util.truncateToTwoDecimals(value),
  })
  public currencyValue: number

  @column({ serialize: (value: number) => Util.truncateToTwoDecimals(value) })
  public utility: number

  @column({ serialize: (value: number) => Util.truncateToTwoDecimals(value) })
  public discount: number

  @column()
  public enabled: boolean

  @column()
  public status: 'pending' | 'revision' | 'reject' | 'accept' | null

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

  @column.dateTime({
    columnName: 'expire_date',
    serialize: (value: DateTime) => value?.toFormat('dd/MM/yyyy'),
  })
  public expireDate: DateTime

  @column.dateTime({
    columnName: 'deleted_at',
    serialize: (value: DateTime) => value?.toFormat('dd/MM/yyyy'),
  })
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

  @hasMany(() => BugetProduct, { foreignKey: 'bugetId' })
  public products: HasMany<typeof BugetProduct>

  @hasMany(() => BugetItem, { foreignKey: 'bugetId' })
  public items: HasMany<typeof BugetItem>

  @hasMany(() => BugetAccount, { foreignKey: 'bugetId' })
  public banks: HasMany<typeof BugetAccount>

  @hasOne(() => BugetDetail, { foreignKey: 'bugetId' })
  public details: HasOne<typeof BugetDetail>

  @hasMany(() => BudgetObservation, { foreignKey: 'bugetId' })
  public observations: HasMany<typeof BudgetObservation>

  @hasMany(() => BudgetPayment, { foreignKey: 'budgetId' })
  public payments: HasMany<typeof BudgetPayment>

  /**
   * Runs before creating a new record
   */
  @beforeCreate()
  public static async setToken(bdt: Buget) {
    if (!bdt.token) bdt.token = Util.generateToken(16)
  }

  @beforeFetch()
  public static filterDeleted(query: ModelQueryBuilderContract<typeof Buget>) {
    query.whereNull('bugets.deleted_at')
  }

  public static castDates(field: string, value: DateTime) {
    if (field === 'expire_date') return value.toFormat('yyyy-MM-dd')
    return value.toFormat('dd/MM/yyyy hh:mm:ss a')
  }

  /**
   * Get total budget amount (calculated from products + items - discount + utility)
   * Note: Requires products and items to be preloaded before calling
   */
  public getTotalAmount(): number {
    const productsTotal =
      this.products?.reduce((sum, product) => {
        return sum + (product.amount || 0) * (product.countPerson || 1)
      }, 0) || 0

    const itemsTotal =
      this.items?.reduce((sum, item) => {
        const itemValue = Number.parseFloat(String(item.value || 0))
        return sum + itemValue
      }, 0) || 0

    const subtotal = productsTotal + itemsTotal
    const discountAmount = subtotal * (this.discount / 100)
    const utilityAmount = subtotal * (this.utility / 100)

    return subtotal - discountAmount + utilityAmount
  }

  /**
   * Get total paid amount (excluding voided payments)
   * Note: Requires payments to be preloaded before calling
   */
  public getTotalPaid(): number {
    return (
      this.payments
        ?.filter((payment) => !payment.voided && !payment.deletedAt)
        .reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    )
  }

  /**
   * Get payment totals grouped by currency
   * Note: Requires payments with ledgerMovement.currency to be preloaded
   */
  public getPaymentTotalsByCurrency(): Array<{
    currencyId: number
    currencySymbol: string
    currencyName: string
    totalPaid: number
    isBudgetCurrency: boolean
  }> {
    const validPayments =
      this.payments?.filter(
        (payment) => !payment.voided && !payment.deletedAt && payment.ledgerMovement
      ) || []

    // Group by currency
    const byCurrency = new Map<number, { symbol: string; name: string; total: number }>()

    validPayments.forEach((payment) => {
      const currencyId = payment.ledgerMovement.currencyId
      const currency = payment.ledgerMovement.currency
      const amount = payment.amount || 0

      if (byCurrency.has(currencyId)) {
        const existing = byCurrency.get(currencyId)!
        existing.total += amount
      } else {
        byCurrency.set(currencyId, {
          symbol: currency?.symbol || '',
          name: currency?.name || '',
          total: amount,
        })
      }
    })

    // Convert to array
    return Array.from(byCurrency.entries()).map(([currencyId, data]) => ({
      currencyId,
      currencySymbol: data.symbol,
      currencyName: data.name,
      totalPaid: data.total,
      isBudgetCurrency: currencyId === this.currencyId,
    }))
  }

  /**
   * Get total paid in the budget's currency, converting from other currencies as needed
   * Uses indicator exchange rates from the payment creation date
   * Note: Requires payments with ledgerMovement and currency to be preloaded
   */
  public async getTotalPaidInBudgetCurrency(): Promise<number> {
    const payments = this.payments ?? []

    let totalInBudgetCurrency = 0

    for (const payment of payments) {
      // Skip voided and deleted payments
      if (payment.voided || payment.deletedAt || !payment.ledgerMovement) {
        continue
      }

      const paymentCurrencyId = payment.ledgerMovement.currencyId
      const paymentAmount = payment.amount || 0

      // If payment is already in budget currency, add directly
      if (paymentCurrencyId === this.currencyId) {
        totalInBudgetCurrency += paymentAmount
        continue
      }

      // Otherwise, convert using indicator rates from payment date
      const convertedAmount = await CurrencyConversionService.convertAmount(
        paymentAmount,
        paymentCurrencyId,
        this.currencyId,
        payment.createdAt
      )

      // If conversion fails, skip this payment (log could be added here)
      if (convertedAmount !== null) {
        totalInBudgetCurrency += convertedAmount
      }
    }

    return totalInBudgetCurrency
  }

  /**
   * Get remaining balance to be paid (in budget currency)
   * Converts all payments to budget currency using indicator rates
   * Note: Requires products, items, and payments to be preloaded before calling
   */
  public async getRemainingBalance(): Promise<number> {
    const total = this.getTotalAmount()
    const paid = await this.getTotalPaidInBudgetCurrency()
    return total - paid
  }

  /**
   * Get payment completion percentage (based on budget currency with conversion)
   * Note: Requires products, items, and payments to be preloaded before calling
   */
  public async getPaymentPercentage(): Promise<number> {
    const total = this.getTotalAmount()
    if (total === 0) return 0

    const paid = await this.getTotalPaidInBudgetCurrency()
    return (paid / total) * 100
  }

  /**
   * Check if budget is fully paid
   * Note: Requires products, items, and payments to be preloaded before calling
   */
  public async isFullyPaid(): Promise<boolean> {
    const remaining = await this.getRemainingBalance()
    return remaining <= 0.01 // Allow for minor rounding differences
  }
}
