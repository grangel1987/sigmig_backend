import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Coin extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column({ columnName: 'created_by' })
  public createdById: number | null

  @column({ columnName: 'updated_by' })
  public updatedById: number | null

  @column()
  public enabled: boolean

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'createdById' })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedById' })
  public updatedBy: BelongsTo<typeof User>

  @beforeCreate()
  public static async setEnabled(coin: Coin) {
    coin.enabled = true
  }

  public serialize() {
    const serialized = super.serialize()
    for (const field of ['created_at', 'updated_at']) {
      if (serialized[field]) {
        serialized[field] = DateTime.fromISO(serialized[field]).toFormat('dd/MM/yyyy hh:mm:ss a')
      }
    }
    return serialized
  }
}