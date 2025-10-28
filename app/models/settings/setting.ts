import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import SettingKey from './setting_key.js'

export default class Setting extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public text: string

  @column()
  public keyId: number | null

  @column({ columnName: 'created_by' })
  public createdById: number | null

  @column({ columnName: 'updated_by_id' })
  public updatedById: number | null

  @column()
  public enabled: boolean

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @column.dateTime({ serializeAs: null })
  public lastLoginAt: DateTime | null

  @column.dateTime({ serializeAs: null })
  public resetPasswordAt: DateTime | null

  @belongsTo(() => SettingKey, { foreignKey: 'keyId' })
  public key: BelongsTo<typeof SettingKey>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updated_by' })
  public updatedBy: BelongsTo<typeof User>

  @beforeCreate()
  public static async setEnabled(typeIdentify: Setting) {
    typeIdentify.enabled = true
  }

  public serialize() {
    const serialized = super.serialize()
    if (serialized.reset_password_at) {
      serialized.reset_password_at = serialized.reset_password_at.format('YYYY-MM-DD HH:mm:ss')
    }
    for (const field of ['created_at', 'updated_at', 'last_login_at']) {
      if (serialized[field]) {
        serialized[field] = DateTime.fromISO(serialized[field]).toFormat('dd/MM/yyyy hh:mm:ss a')
      }
    }
    return serialized
  }
}