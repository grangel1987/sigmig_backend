import Booking from '#models/booking/booking'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BookingFeeding extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number

    @column()
    public feeding: string

    @column()
    public count: number

    @belongsTo(() => Booking, { foreignKey: 'bookingId' })
    public booking: BelongsTo<typeof Booking>
}