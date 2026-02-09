import BudgetPayment from '#models/budget_payment'
import BugetProduct from '#models/bugets/buget_product'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BudgetpaymentDetail extends BaseModel {
  public static table = 'budget_payment_details'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'budget_payment_id' })
  declare budgetPaymentId: number

  @belongsTo(() => BudgetPayment, { foreignKey: 'budgetPaymentId' })
  declare budgetPayment: BelongsTo<typeof BudgetPayment>

  @column({ columnName: 'buget_product_id' })
  declare bugetProductId: number | null

  @belongsTo(() => BugetProduct, { foreignKey: 'bugetProductId' })
  declare bugetProduct: BelongsTo<typeof BugetProduct>

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? null : Number(value),
  })
  declare amount: number | null
}
