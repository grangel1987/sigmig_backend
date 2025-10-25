import Permission from '#models/permissions/permission'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class RolPermission extends BaseModel {

  static table = 'rols_permissions'

  @column({ isPrimary: true })
  public id: number

  @column()
  public rolId: number

  @column()
  public permissionId: number

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @belongsTo(() => Permission)
  public permissions: BelongsTo<typeof Permission>
}