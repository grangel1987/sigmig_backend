import BusinessUser from '#models/business/business_user'
import Notification from '#models/notifications/notification'
import Rol from '#models/role/rol'
import User from '#models/users/user'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class NotificationType extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public name: string

    @column()
    public code: string | null

    @column()
    public description: string | null

    @column()
    public enabled: boolean

    @column()
    public channel: string | null

    @column()
    public severity: string | null

    @column({ columnName: 'created_by' })
    public createdById: number

    @column({ columnName: 'updated_by' })
    public updatedById: number

    @column.dateTime({ autoCreate: true, serializeAs: null })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
    public updatedAt: DateTime

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @hasMany(() => Notification)
    public notifications: HasMany<typeof Notification>

    @manyToMany(() => BusinessUser, {
        pivotTable: 'notification_type_business_users',
        pivotForeignKey: 'notification_type_id',
        pivotRelatedForeignKey: 'business_user_id',
    })
    public businessUsers: ManyToMany<typeof BusinessUser>

    @manyToMany(() => Rol, {
        pivotTable: 'notification_type_rols',
        pivotForeignKey: 'notification_type_id',
        pivotRelatedForeignKey: 'rol_id',
    })
    public rols: ManyToMany<typeof Rol>
}
