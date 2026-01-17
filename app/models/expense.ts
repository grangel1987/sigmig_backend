import Business from '#models/business/business'
import Coin from '#models/coin/coin'
import LedgerMovement from '#models/ledger_movement'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Expense extends BaseModel {
  public static table = 'expenses'

  @column({ isPrimary: true })
  public id: number

  @column()
  public businessId: number

  @belongsTo(() => Business, { foreignKey: 'businessId' })
  public business: BelongsTo<typeof Business>

  @column.date()
  public date: DateTime

  @column({
    prepare: (value?: number) => (value ?? null),
    consume: (value?: string | number) =>
      value === null || value === undefined ? 0 : Number(value),
  })
  public amount: number

  @column()
  public currencyId: number

  @belongsTo(() => Coin, { foreignKey: 'currencyId' })
  public currency: BelongsTo<typeof Coin>

  @column()
  public description?: string

  @column()
  public status: 'paid' | 'pending' | 'canceled' = 'pending'

  @hasMany(() => LedgerMovement, { foreignKey: 'expenseId' })
  public payments: HasMany<typeof LedgerMovement>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
