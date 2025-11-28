import Business from '#models/business/business'
import BusinessUserPermission from '#models/business/business_user_permission'
import BusinessUserRol from '#models/business/business_user_rol'
import User from '#models/users/user'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessUser extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public userId: number

  @column()
  public businessId: number

  @column()
  public isSuper: boolean

  @column()
  public isAuthorizer: number

  @column()
  public selected: boolean

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime


  @belongsTo(() => User, { foreignKey: 'userId' })
  public user: BelongsTo<typeof User>

  @belongsTo(() => Business)
  public business: BelongsTo<typeof Business>

  @hasMany(() => BusinessUserRol)
  public businessUserRols: HasMany<typeof BusinessUserRol>

  @hasMany(() => BusinessUserPermission)
  public bussinessUserPermissions: HasMany<typeof BusinessUserPermission>


}