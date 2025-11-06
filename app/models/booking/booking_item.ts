import Booking from '#models/booking/booking'
import SettingBookingItem from '#models/booking/setting_booking_item'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BookingItem extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number

    @column()
    public itemId: number

    @column()
    public quantity: number

    @belongsTo(() => SettingBookingItem, { foreignKey: 'itemId' })
    public item: BelongsTo<typeof SettingBookingItem>

    @belongsTo(() => Booking, { foreignKey: 'bookingId' })
    public booking: BelongsTo<typeof Booking>
}