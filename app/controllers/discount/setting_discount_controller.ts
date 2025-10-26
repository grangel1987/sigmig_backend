import SettingDiscount from '#models/discount/setting_discount';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { HttpContext } from '@adonisjs/core/http';
import db from '@adonisjs/lucid/services/db';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingDiscountController {
    public async index({ request, i18n, response }: HttpContext) {
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const query = SettingDiscount.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            const discounts = await (page ? query.paginate(page, perPage || 10) : query)

            return discounts
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
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim(),
                    type: vine.string(),
                    code: vine.string().trim(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const discount = await SettingDiscount.create({
                name: data.name,
                type: data.type,
                code: data.code,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await discount.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await discount.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                discount,
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
        const discountId = params.id
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim(),
                    type: vine.string(),
                    code: vine.string().trim(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const existing = await db.from('setting_discounts')
                .whereNot('id', discountId)
                .where('code', data.code)
                .first()

            if (existing) {
                return response.status(500).json({
                    ...MessageFrontEnd(
                        i18n.formatMessage('messages.exists_code'),
                        i18n.formatMessage('messages.error_title')
                    ),
                })
            }

            const discount = await SettingDiscount.findOrFail(discountId)
            discount.merge({
                name: data.name,
                type: data.type,
                code: data.code,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await discount.save()

            await discount.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await discount.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                discount,
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
        const discountId = params.id
        const dateTime = DateTime.local()

        try {
            const discount = await SettingDiscount.findOrFail(discountId)
            const status = !discount.enabled
            discount.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await discount.save()

            await discount.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await discount.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                discount,
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
}