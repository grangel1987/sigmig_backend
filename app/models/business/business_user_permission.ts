import Permission from '#models/permissions/permission'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessUserPermission extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public business_user_id: number

  @column()
  public permission_id: number

  @column.dateTime({ serializeAs: null })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updated_at: DateTime

  @belongsTo(() => Permission)
  public permissions: BelongsTo<typeof Permission>
}