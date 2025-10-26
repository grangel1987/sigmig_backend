import SettingBookingItem from '#models/booking/setting_booking_item'; // Adjust path
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';

export default class BookingItem extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number

    @column()
    public itemId: number

    @belongsTo(() => SettingBookingItem, { foreignKey: 'itemId' })
    public item: BelongsTo<typeof SettingBookingItem>
}