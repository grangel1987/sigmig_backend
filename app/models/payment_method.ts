import LedgerMovement from '#models/ledger_movement'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class PaymentMethod extends BaseModel {
  public static table = 'payment_methods'

  @column({ isPrimary: true })
  public id: number

  @column()
  public businessId: number

  @column()
  public name: string

  @column()
  public description: string

  @column()
  public disabled: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @hasMany(() => LedgerMovement, { foreignKey: 'paymentMethodId' })
  public transactions: HasMany<typeof LedgerMovement>
}
