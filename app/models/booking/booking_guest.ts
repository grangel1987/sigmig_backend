import Booking from '#models/booking/booking'
import Setting from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BookingGuest extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public bookingId: number

    @column()
    public name: string

    @column({ columnName: 'last_name' })
    public lastName: string

    @column({ columnName: 'identify_type_id' })
    public identifyTypeId: number

    @column()
    public identify: string

    @column()
    public phone: string

    @column()
    public email: string

    @column({ columnName: 'from_where' })
    public fromWhere: string

    @column({ columnName: 'answer_1' })
    public answer1: boolean

    @column({ columnName: 'answer_2' })
    public answer2: boolean

    @column({ columnName: 'mobility_pass_url_short' })
    public mobilityPassUrlShort: string | null

    @column({ columnName: 'mobility_pass_url' })
    public mobilityPassUrl: string | null

    @belongsTo(() => Setting, { foreignKey: 'identifyTypeId' })
    public typeIdentify: BelongsTo<typeof Setting>

    @belongsTo(() => Booking, { foreignKey: 'bookingId' })
    public booking: BelongsTo<typeof Booking>
}