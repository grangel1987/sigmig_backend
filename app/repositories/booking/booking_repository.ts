/* import Booking from '#models/bookings/booking'; // Adjust path based on your project structure

export default class BookingRepository {
    public static async findByNameOrEmail(name: string) {
        try {
            return await Booking.query()
                .select('bookings.id', 'clients.name', 'clients.identify', 'bookings.created_at', 'cities.name as city', 'settings.text as type_identify', 'bookings.attended')
                .join('clients', 'bookings.client_id', 'clients.id')
                .join('cities', 'clients.city_id', 'cities.id')
                .join('settings', 'clients.identify_type_id', 'settings.id')
                .whereRaw('(clients.name ILIKE ? OR clients.email ILIKE ?)', [`%${name}%`, `%${name}%`])
        } catch (error) {
            console.log(error)
            throw error
        }
    }

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
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
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
} */