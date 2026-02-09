import SettingBookingItem from '#models/booking/setting_booking_item'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { bookingItemStoreValidator, bookingItemUpdateValidator } from '#validators/booking'
import { indexFiltersWithStatus } from '#validators/general'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingBookingItemController {
    public async index({ response, request, i18n }: HttpContext) {
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        try {
            const query = SettingBookingItem.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            if (text) {
                const likeVal = `%${text}%`
                query.where((qb) => qb.whereILike('name', likeVal).orWhereILike('description', likeVal))
            }

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            const items = await query.paginate(page || 1, perPage || 10)

            return items
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
        const data = await request.validateUsing(bookingItemStoreValidator)
        const dateTime = DateTime.local()

        try {
            const item = await SettingBookingItem.create({
                name: data.name,
                isRoom: data.isRoom,
                isQuantity: data.isQuantity,
                description: data.description,
                createdAt: dateTime,
                updatedAt: dateTime,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
            })

            await item.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
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
        const itemId = params.id
        const data = await request.validateUsing(bookingItemUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const item = await SettingBookingItem.findOrFail(itemId)
            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            if (data.isRoom !== undefined) payload.isRoom = data.isRoom
            if (data.isQuantity !== undefined) payload.isQuantity = data.isQuantity
            if (data.description !== undefined) payload.description = data.description
            item.merge({
                ...payload,
                updatedAt: dateTime,
                updatedById: auth.user!.id,
            })
            await item.save()

            await item.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
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
        const itemId = params.id
        const dateTime = DateTime.local()

        try {
            const item = await SettingBookingItem.findOrFail(itemId)
            const status = !item.enabled
            item.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await item.save()

            await item.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
                message: i18n.formatMessage(item.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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
            const items = await SettingBookingItem.query().where('enabled', true)

            const formattedItems = items.map((item) => ({
                text: item.name,
                value: item.id,
                isRoom: item.isRoom,
                isQuantity: item.isQuantity,
                description: item.description,
            }))

            return response.status(200).json(formattedItems)
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