import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class BookingFeeding extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number
}