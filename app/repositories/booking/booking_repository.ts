import Booking from '#models/booking/booking'
import db from '@adonisjs/lucid/services/db'

export default class BookingRepository {
    // Find bookings by client name or email (legacy behavior, raw SQL)
    public static async findByNameOrEmail(name: string) {
        try {
            const like = `%${name}%`
            const query = `
                SELECT 
                    bookings.id,
                    clients.name,
                    clients.identify,
                    bookings.created_at,
                    cities.name AS city,
                    settings.text AS type_identify,
                    bookings.attended
                FROM 
                    bookings
                    INNER JOIN clients ON bookings.client_id = clients.id
                    INNER JOIN cities ON clients.city_id = cities.id
                    INNER JOIN settings ON clients.identify_type_id = settings.id
                WHERE (clients.name LIKE ? OR clients.email LIKE ?)`

            const result = await db.rawQuery(query, [like, like])
            return (result.rows ?? result[0]) as any[]
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    // Find one booking with full preloads
    public static async findBookingById(bookingId: number) {
        try {
            return await Booking.query()
                .where('id', bookingId)
                .preload('guests', (builder) => {
                    builder.preload('typeIdentify', (subBuilder) => subBuilder.select(['id', 'text']))
                })
                .preload('properties', (builder) => {
                    builder.preload('propertie')
                })
                .preload('items', (builder) => {
                    builder.preload('item', (subBuilder) => subBuilder.select(['id', 'name', 'description']))
                })
                .preload('feedings')
                .preload('attendedBy', (builder) => {
                    builder
                        .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
                        .select(['id', 'personal_data_id', 'email'])
                })
                .preload('client', (builder) => {
                    builder
                        .select(['id', 'identify_type_id', 'identify', 'name', 'url', 'phone', 'email', 'address', 'city_id'])
                        .preload('typeIdentify', (subBuilder) => subBuilder.select(['id', 'text']))
                        .preload('city', (subBuilder) => subBuilder.select(['id', 'name']))
                })
                .preload('notes')
                .first()
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}