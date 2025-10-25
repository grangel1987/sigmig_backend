import Business from '#models/business/business'
import BusinessUserPermission from '#models/business/business_user_permission'
import BusinessUserRol from '#models/business/business_user_rol'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessUser extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public user_id: number

  @column()
  public business_id: number

  @column.dateTime({ serializeAs: null })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updated_at: DateTime

  @belongsTo(() => Business)
  public business: BelongsTo<typeof Business>

  @hasMany(() => BusinessUserRol)
  public businessUserRols: HasMany<typeof BusinessUserRol>

  @hasMany(() => BusinessUserPermission)
  public bussinessUserPermissions: HasMany<typeof BusinessUserPermission>
}