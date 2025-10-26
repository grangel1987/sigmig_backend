import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class BookingNote extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number
}