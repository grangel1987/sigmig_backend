import Business from '#models/business/business'
import BusinessUserPermission from '#models/business/business_user_permission'
import BusinessUserRol from '#models/business/business_user_rol'
import Rol from '#models/role/rol'
import User from '#models/users/user'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
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

  @manyToMany(() => Rol, {
    pivotTable: 'business_user_rols',
    pivotForeignKey: 'business_user_id',
    pivotRelatedForeignKey: 'rol_id',
    pivotColumns: ['signature']
  })
  public roles: ManyToMany<typeof Rol>


}