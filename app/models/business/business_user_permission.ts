import Permission from '#models/permissions/permission'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BusinessUserPermission extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public businessUserId: number

  @column()
  public permissionId: number

  @belongsTo(() => Permission)
  public permissions: BelongsTo<typeof Permission>
}