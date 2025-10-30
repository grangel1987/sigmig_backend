import SettingBookingProperty from '#models/booking/setting_booking_property'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { bookingPropertyStoreValidator, bookingPropertyUpdateValidator } from '#validators/booking'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingBookingPropertieController {
    public async index({ response, request, i18n }: HttpContext) {

        const { page, perPage } = await request.validateUsing(vine.compile(vine.object({
            page: vine.number().positive().optional(),
            perPage: vine.number().positive().optional()
        })))

        try {
            const properties = await SettingBookingProperty.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                }).paginate(page || 1, perPage || 10)

            return properties
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async store({ request, response, auth, i18n }: HttpContext) {
        const data = await request.validateUsing(bookingPropertyStoreValidator)
        const dateTime = DateTime.local()

        try {
            const propertie = await SettingBookingProperty.create({
                name: data.name,
                manyRooms: data.manyRooms,
                description: data.description,
                numberMaxPerson: data.numberMaxPerson,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            })

            await propertie.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await propertie.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                propertie,
                message: i18n.formatMessage('messages.store_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const propertieId = params.id
        const data = await request.validateUsing(bookingPropertyUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const propertie = await SettingBookingProperty.findOrFail(propertieId)
            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            if (data.manyRooms !== undefined) payload.manyRooms = data.manyRooms
            if (data.description !== undefined) payload.description = data.description
            if (data.numberMaxPerson !== undefined) payload.numberMaxPerson = data.numberMaxPerson
            propertie.merge({
                ...payload,
                updatedAt: dateTime,
                updatedById: auth.user!.id,
            })
            await propertie.save()

            await propertie.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await propertie.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                propertie,
                message: i18n.formatMessage('messages.update_ok'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async changeStatus({ params, response, auth, i18n }: HttpContext) {
        const propertieId = params.id
        const dateTime = DateTime.local()

        try {
            const propertie = await SettingBookingProperty.findOrFail(propertieId)
            const status = !propertie.enabled
            propertie.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await propertie.save()

            await propertie.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await propertie.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                propertie,
                message: i18n.formatMessage(propertie.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                title: i18n.formatMessage('messages.ok_title'),
            } as MessageFrontEndType)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }
    }

    public async select({ response, i18n }: HttpContext) {
        try {
            const properties = await SettingBookingProperty.query().where('enabled', true)

            const formattedProperties = properties.map((item) => ({
                text: item.name,
                value: item.id,
                description: item.description,
                manyRooms: item.manyRooms,
                numberMaxPerson: item.numberMaxPerson,
            }))

            return response.status(200).json(formattedProperties)
        } catch (error) {
            console.log(error)
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                ),
            })
        }

    }
}