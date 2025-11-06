import Booking from '#models/booking/booking'
import SettingBookingNote from '#models/booking/setting_booking_note'
import BookingRepository from '#repositories/booking/booking_repository'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class BookingController {
    // Helper: Try to send emails using templates; no-op if packages not installed
    private async sendBookingEmails(payload: any, type: 'store' | 'update') {
        try {
            // @ts-ignore - optional dependency
            const View = (await import('@adonisjs/view/services/view')).default
            // @ts-ignore - optional dependency
            const Mail = (await import('@adonisjs/mail/services/main')).default

            const clientHtml = await View.render(`emails/booking_${type}`, payload)
            const adminHtml = await View.render('emails/booking_store_admin', payload)
            const subjectClient = type === 'store' ? 'Registro de reserva' : 'Actualizacion de reserva'
            const subjectAdmin = 'Nueva reserva registrada'

            if (payload?.email) {
                await Mail.send((message: any) => {
                    message.to(payload.email).subject(subjectClient).html(clientHtml)
                })
            }
            if (payload?.admin_email) {
                await Mail.send((message: any) => {
                    message.to(payload.admin_email).subject(subjectAdmin).html(adminHtml)
                })
            }
        } catch (err) {
            // Mail/View likely not installed; swallow
            return
        }
    }

    // POST /booking/store
    public async store({ request, response, i18n }: HttpContext) {
        const trx = await db.transaction()
        try {
            const dateTime = await Util.getDateTimes(request.ip())
            const { booking, client_id, guests = [], propertie = {}, items = [], feeding = [] } = request.all()

            // Normalize booking payload
            const b: any = { ...booking }
            if (b?.type === 'MENSUAL') {
                const checkOut = Util.getDateAddMonths(DateTime.fromISO(b.check_in), b.month_quantity || 0, false)
                b.check_out = checkOut
            } else {
                b.month_quantity = 0
            }
            delete b.type_view

            const bk = await Booking.create({
                clientId: Number(client_id),
                createdAt: dateTime,
                checkIn: DateTime.fromISO(b.check_in),
                checkOut: DateTime.fromISO(b.check_out),
                type: b.type || '',
                monthQuantity: Number(b.month_quantity || 0),
                attended: false,
            } as any, { client: trx })
            // Ensure subsequent related operations use same transaction
            bk.useTransaction(trx)

            // Guests via Lucid
            const guestsRows = (guests as any[]).map((g) => ({
                name: g?.name || '',
                lastName: g?.last_name ?? g?.lastName ?? '',
                identifyTypeId: g?.identify_type_id ?? g?.identifyTypeId,
                identify: g?.identify || '',
                phone: g?.phone || '',
                email: g?.email || '',
                fromWhere: g?.from_where ?? g?.fromWhere ?? '',
                answer1: g?.answer_1 ? true : !!g?.answer1,
                answer2: g?.answer_2 ? true : !!g?.answer2,
                mobilityPassUrlShort: g?.mobility_pass_url_short ?? g?.mobilityPassUrlShort ?? null,
                mobilityPassUrl: g?.mobility_pass_url ?? g?.mobilityPassUrl ?? null,
            }))
            if (guestsRows.length) await bk.related('guests').createMany(guestsRows as any)

            // Property via Lucid
            const propId = (propertie as any).propertie_id ?? (propertie as any).propertieId
            if (propId) {
                await bk.related('properties').create({ propertieId: Number(propId) } as any)
            }

            // Items via Lucid
            const itemsRows = (items as any[]).map((it) => ({
                itemId: (it as any)?.value ?? (it as any)?.item_id ?? (it as any)?.itemId,
                quantity: Number((it as any)?.quantity || 0),
            }))
            if (itemsRows.length) await bk.related('items').createMany(itemsRows as any)

            // Feedings via Lucid
            const feedingRows = (feeding as any[]).map((f) => ({
                feeding: (f as any)?.feeding,
                count: Number((f as any)?.count || 0),
            }))
            if (feedingRows.length) await bk.related('feedings').createMany(feedingRows as any)

            // Default notes (enabled) via Lucid
            const setNotes = await SettingBookingNote.query().useTransaction(trx).where('enabled', true)
            const notesArray = setNotes.map((n) => ({ note: n.note }))
            if (notesArray.length) await bk.related('notes').createMany(notesArray as any)

            await trx.commit()

            // Prepare email payload
            const payloadEmail: any = {
                propertie: (propertie as any)?.propertie_view,
                items,
                feedings: feeding,
                guests,
                email: undefined,
                full_name: undefined,
                booking: bk.toJSON(),
                admin_email: undefined,
            }

            try {
                await bk.load('client', (builder) => builder.preload('city'))
                payloadEmail.email = bk.client?.email
                payloadEmail.full_name = bk.client?.name
            } catch { }

            await this.sendBookingEmails(payloadEmail, 'store')

            return response.status(201).json({
                bk,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            await trx.rollback()
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }
    // GET /booking/:id
    public async show({ params }: HttpContext) {
        const bookingId = Number(params.id)
        const booking = await BookingRepository.findBookingById(bookingId)
        return booking
    }

    // POST /booking/find/number { id }
    public async findByNro({ request }: HttpContext) {
        const { id } = request.all()
        const bookingId = Number(id)
        const bookings = await Booking.query()
            .where('id', bookingId)
            .preload('properties', (builder) => builder.preload('propertie'))
            .preload('client', (builder) => {
                builder
                    .select(['id', 'identify_type_id', 'identify', 'name', 'url', 'phone', 'email', 'address', 'city_id'])
                    .preload('typeIdentify', (sub) => sub.select(['id', 'text']))
                    .preload('city', (sub) => sub.select(['id', 'name']))
            })
        return bookings
    }

    // POST /booking/find/status { status: 'attended' | 'unattended' }
    public async findByStatus({ request }: HttpContext) {
        const { status } = request.all()
        const st = String(status) === 'attended'
        const bookings = await Booking.query()
            .where('attended', st ? 1 : 0)
            .preload('properties', (builder) => builder.preload('propertie'))
            .preload('client', (builder) => {
                builder
                    .select(['id', 'identify_type_id', 'identify', 'name', 'url', 'phone', 'email', 'address', 'city_id'])
                    .preload('typeIdentify', (sub) => sub.select(['id', 'text']))
                    .preload('city', (sub) => sub.select(['id', 'name']))
            })
        return bookings
    }

    // POST /booking/find/name { name }
    public async findByName({ request }: HttpContext) {
        const { name } = request.all()
        const rows = await BookingRepository.findByNameOrEmail(String(name || ''))
        // Keep legacy-like output, minimal mapping
        return rows.map((r: any) => ({
            id: r.id,
            client: {
                name: r.name,
                identify: r.identify,
                type_identify: r.type_identify,
                city: r.city,
            },
            created_at: Util.parseDateFormatFriendly(r.created_at, '/', true),
            attended: !!r.attended,
        }))
    }

    // POST /booking/find/buget { nro_buget }
    public async findByNroBuget({ request }: HttpContext) {
        const { nro_buget } = request.all()
        const bookings = await Booking.query()
            .where('nro_buget', String(nro_buget || ''))
            .preload('properties', (builder) => builder.preload('propertie'))
            .preload('client', (builder) => {
                builder
                    .select(['id', 'identify_type_id', 'identify', 'name', 'url', 'phone', 'email', 'address', 'city_id'])
                    .preload('typeIdentify', (sub) => sub.select(['id', 'text']))
                    .preload('city', (sub) => sub.select(['id', 'name']))
            })
        return bookings
    }

    // POST /booking/count/unattended
    public async findCountUnattended({ request }: HttpContext) {
        await Util.getDateTimes(request.ip())
        const result = await db.from('bookings').where('attended', 0).count('* as total')
        const row = Array.isArray(result) ? (result as any)[0] : (result as any)
        return row?.total ?? 0
    }

    // POST /booking/find/complements { bookingId }
    public async findComplements({ request }: HttpContext) {
        const { bookingId } = request.all()
        const booking = await Booking.query()
            .where('id', Number(bookingId))
            .preload('feedings')
            .preload('guests', (builder) => builder.preload('typeIdentify'))
            .first()
        return booking
    }

    // PUT /booking/update/:booking_id
    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const bookingId = Number(params.booking_id)
        const trx = await db.transaction()
        try {
            const { nro_buget } = request.all()
            const dateTime = await Util.getDateTimes(request.ip())
            // Load and update via Lucid within the same transaction
            const booking = await Booking.findOrFail(bookingId)
            booking.useTransaction(trx)
            booking.nroBuget = Number(nro_buget || 0)
            booking.attended = true
            booking.attendedById = auth.user!.id
            booking.attendedAt = dateTime
            await booking.save()

            await trx.commit()

            const payloadEmail: any = { full_name: undefined, bookingId }
            try {
                await booking.load('client')
                payloadEmail.full_name = booking.client?.name
            } catch { }
            await this.sendBookingEmails(payloadEmail, 'update')

            return response.status(201).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            )
        } catch (error) {
            await trx.rollback()
            return response.status(500).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }
    }
}
