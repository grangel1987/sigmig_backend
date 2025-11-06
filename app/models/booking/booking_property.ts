import Booking from '#models/booking/booking'
import SettingBookingProperty from '#models/booking/setting_booking_property'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BookingPropertie extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number

    @column()
    public propertieId: number

    @belongsTo(() => SettingBookingProperty, { foreignKey: 'propertieId' })
    public propertie: BelongsTo<typeof SettingBookingProperty>

    @belongsTo(() => Booking, { foreignKey: 'bookingId' })
    public booking: BelongsTo<typeof Booking>
}