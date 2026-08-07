import Buget from '#models/bugets/buget'
import BudgetPayment from '#models/budget_payment'
import BudgetEdpDetail from '#models/budget_edp_detail'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BudgetEdp extends BaseModel {
  public static table = 'budget_edps'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'budget_id' })
  declare budgetId: number

  @belongsTo(() => Buget, { foreignKey: 'budgetId' })
  declare budget: BelongsTo<typeof Buget>

  @column({ columnName: 'edp_number' })
  declare edpNumber: number

  @column()
  declare name: string | null

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

  @column.date({ columnName: 'due_date' })
  declare dueDate: DateTime | null

  @column()
  declare status: 'pending' | 'partial' | 'paid'

  @hasMany(() => BudgetPayment, { foreignKey: 'budgetEdpId' })
  declare payments: HasMany<typeof BudgetPayment>

  @hasMany(() => BudgetEdpDetail, { foreignKey: 'budgetEdpId' })
  declare details: HasMany<typeof BudgetEdpDetail>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column()
  declare deletedBy: number | null
}
