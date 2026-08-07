import BudgetEdp from '#models/budget_edp'
import BugetProduct from '#models/bugets/buget_product'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BudgetEdpDetail extends BaseModel {
  public static table = 'budget_edp_details'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'budget_edp_id' })
  declare budgetEdpId: number

  @belongsTo(() => BudgetEdp, { foreignKey: 'budgetEdpId' })
  declare budgetEdp: BelongsTo<typeof BudgetEdp>

  @column({ columnName: 'buget_product_id' })
  declare bugetProductId: number

  @belongsTo(() => BugetProduct, { foreignKey: 'bugetProductId' })
  declare bugetProduct: BelongsTo<typeof BugetProduct>

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  declare percentage: number

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  declare amount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
