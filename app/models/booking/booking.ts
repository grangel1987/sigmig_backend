import BookingFeeding from '#models/booking/booking_feeding'; // Adjust path
import BookingGuest from '#models/booking/booking_guest';
import BookingItem from '#models/booking/booking_item';
import BookingNote from '#models/booking/booking_note';
import BookingPropertie from '#models/booking/booking_property';
import Client from '#models/clients/client';
import User from '#models/users/user';
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm';
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations';
import { DateTime } from 'luxon';

export default class Booking extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public clientId: number

    @column({ columnName: 'type' })
    public type: string

    @column({ columnName: 'month_quantity' })
    public monthQuantity: number | null

    @column({ columnName: 'nro_buget' })
    public nroBuget: number | null

    @column({ columnName: 'attended' })
    public attended: boolean

    @column({ columnName: 'attended_by' })
    public attendedById: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime()
    public checkIn: DateTime

    @column.dateTime()
    public checkOut: DateTime

    @column.dateTime()
    public attendedAt: DateTime

    @hasMany(() => BookingGuest, { foreignKey: 'bookingId' })
    public guests: HasMany<typeof BookingGuest>

    @hasOne(() => BookingPropertie, { foreignKey: 'bookingId' })
    public properties: HasOne<typeof BookingPropertie>

    @hasMany(() => BookingItem, { foreignKey: 'bookingId' })
    public items: HasMany<typeof BookingItem>

    @hasMany(() => BookingNote, { foreignKey: 'bookingId' })
    public notes: HasMany<typeof BookingNote>

    @hasMany(() => BookingFeeding, { foreignKey: 'bookingId' })
    public feedings: HasMany<typeof BookingFeeding>
    @belongsTo(() => Client, { foreignKey: 'clientId' })
    public client: BelongsTo<typeof Client>

    @belongsTo(() => User, { foreignKey: 'attendedById' })
    public attendedBy: BelongsTo<typeof User>

    public static castDates(field: string, value: DateTime): string {
        if (field === 'check_in' || field === 'check_out') {
            return value.toFormat('yyyy-MM-dd')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}