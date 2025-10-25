import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Country extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public code: string

  @column()
  public nationality: string

  @column()
  public phoneCode: string

  @column()
  public flag: string

  @column()
  public enabled: boolean

  @column({ columnName: 'created_by' })
  public createdById: number | null

  @column({ columnName: 'updated_by' })
  public updatedById: number | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime | null

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime | null

  @beforeCreate()
  public static async setEnabled(model: Country) {
    model.enabled = true
  }

  @belongsTo(() => User, {
    foreignKey: 'createdById',
  })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'updatedById',
  })
  public updatedBy: BelongsTo<typeof User>

  public serialize() {
    const serialized = super.serialize()
    if (serialized.reset_password_at) {
      serialized.reset_password_at = serialized.reset_password_at.format('YYYY-MM-DD HH:mm:ss')
    }
    for (const field of ['created_at', 'updated_at']) {
      if (serialized[field]) {
        serialized[field] = DateTime.fromISO(serialized[field]).toFormat('dd/MM/yyyy hh:mm:ss a')
      }
    }
    return serialized
  }
}