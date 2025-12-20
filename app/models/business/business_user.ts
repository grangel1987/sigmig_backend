import Business from '#models/business/business'
import BusinessUserPermission from '#models/business/business_user_permission'
import BusinessUserRol from '#models/business/business_user_rol'
import Notification from '#models/notifications/notification'
import NotificationType from '#models/notifications/notification_type'
import NotificationUser from '#models/notifications/notification_user'
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

  @hasMany(() => NotificationUser)
  public notificationUsers: HasMany<typeof NotificationUser>

  @manyToMany(() => Notification, {
    pivotTable: 'notification_users',
    pivotForeignKey: 'business_user_id',
    pivotRelatedForeignKey: 'notification_id',
    pivotColumns: ['status', 'delivered_at', 'read_at', 'created_at'],
  })
  public notifications: ManyToMany<typeof Notification>

  @manyToMany(() => NotificationType, {
    pivotTable: 'notification_type_business_users',
    pivotForeignKey: 'business_user_id',
    pivotRelatedForeignKey: 'notification_type_id',
  })
  public notificationTypes: ManyToMany<typeof NotificationType>

  @manyToMany(() => Rol, {
    pivotTable: 'business_user_rols',
    pivotForeignKey: 'business_user_id',
    pivotRelatedForeignKey: 'rol_id',
    pivotColumns: ['signature']
  })
  public roles: ManyToMany<typeof Rol>


}