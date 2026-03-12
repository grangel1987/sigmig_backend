import BusinessUser from '#models/business/business_user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Notification from './notification.js'

const toMysqlDateTime = (value: DateTime | null) => {
  if (!value) return null
  return value.toFormat('yyyy-LL-dd HH:mm:ss')
}

export default class NotificationBusinessUser extends BaseModel {
  static table = 'notification_users'

  @column({ isPrimary: true })
  public id: number

  @column({ columnName: 'notification_id' })
  public notificationId: number

  @column({ columnName: 'business_user_id' })
  public businessUserId: number

  @column()
  public status: 'unread' | 'read' | 'archived'

  @column.dateTime({
    columnName: 'delivered_at',
    serializeAs: null,
    prepare: (value: DateTime | null) => toMysqlDateTime(value),
  })
  public deliveredAt: DateTime | null

  @column.dateTime({
    columnName: 'read_at',
    serializeAs: null,
    prepare: (value: DateTime | null) => toMysqlDateTime(value),
  })
  public readAt: DateTime | null

  @column.dateTime({
    columnName: 'created_at',
    autoCreate: true,
    serializeAs: null,
    prepare: (value: DateTime | null) => toMysqlDateTime(value),
  })
  public createdAt: DateTime

  @belongsTo(() => Notification)
  public notification: BelongsTo<typeof Notification>

  @belongsTo(() => BusinessUser)
  public businessUser: BelongsTo<typeof BusinessUser>
}
