import Buget from '#models/bugets/buget'
import LedgerMovement from '#models/ledger_movement'
import { BaseModel, belongsTo, column, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BudgetPayment extends BaseModel {
  public static table = 'budget_payments'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'budget_id' })
  declare budgetId: number

  @belongsTo(() => Buget, { foreignKey: 'budgetId' })
  declare budget: BelongsTo<typeof Buget>

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  declare amount: number

  @column.date()
  declare date: DateTime

  @column()
  declare voided: boolean

  @column.dateTime()
  declare voidedAt: DateTime | null

  @column.dateTime()
  declare deletedAt: DateTime | null

  @column()
  declare deletedBy: number

  @hasOne(() => LedgerMovement, { foreignKey: 'budgetPaymentId' })
  public ledgerMovement: HasOne<typeof LedgerMovement>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}