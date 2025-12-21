import User from '#models/users/user'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import NotificationBusinessUser from './notification_business_user.js'
import NotificationType from './notification_type.js'

export default class Notification extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'notification_type_id' })
    public notificationTypeId: number | null

    @column({ columnName: 'business_id' })
    public businessId: number | null

    @column()
    public title: string

    @column()
    public body: string | null

    @column({
        prepare: (value: any) => typeof value === 'string' ? value : JSON.stringify(value),
        consume: (value) => typeof value == 'string' ? JSON.parse(value) : value,
    })
    public payload: Record<string, any> | null

    @column({ columnName: 'created_by' })
    public createdById: number

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @belongsTo(() => NotificationType)
    public type: BelongsTo<typeof NotificationType>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @hasMany(() => NotificationBusinessUser)
    public recipients: HasMany<typeof NotificationBusinessUser>
}
