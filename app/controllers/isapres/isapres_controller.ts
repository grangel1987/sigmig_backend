import SettingIsapre from '#models/isapre/setting_isapre';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { HttpContext } from '@adonisjs/core/http';
import db from '@adonisjs/lucid/services/db';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingIsapreController {
    public async index({ request, response, i18n }: HttpContext) {
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const query = SettingIsapre.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            const isapres = await (page ? query.paginate(page, perPage || 10) : query)

            return isapres
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
                    code: vine.string().trim().unique({ table: 'setting_isapres', column: 'code' }),
                    type: vine.string(),
                    value: vine.number(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const isapre = await SettingIsapre.create({
                name: data.name,
                code: data.code,
                type: data.type,
                value: data.value,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await isapre.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await isapre.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                isapre,
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
        const isapreId = params.id
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim().optional(),
                    code: vine.string().trim(),
                    type: vine.string().optional(),
                    value: vine.number().optional(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const existing = await db.from('setting_isapres')
                .whereNot('id', isapreId)
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

            const isapre = await SettingIsapre.findOrFail(isapreId)
            isapre.merge({
                name: data.name,
                code: data.code,
                type: data.type,
                value: data.value,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await isapre.save()

            await isapre.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await isapre.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                isapre,
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
        const isapreId = params.id
        const dateTime = DateTime.local()

        try {
            const isapre = await SettingIsapre.findOrFail(isapreId)
            const status = !isapre.enabled
            isapre.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await isapre.save()

            await isapre.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await isapre.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                isapre,
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

    public async select({ response, i18n }: HttpContext) {
        try {
            const isapres = await SettingIsapre.query()
                .where('enabled', true)
                .whereNot('id', 2)
                .orderBy('id')

            const result = isapres.map((isapre) => ({
                text: `${isapre.code} - ${isapre.name}`,
                id: isapre.id,
                type: isapre.type,
                value: isapre.value,
            }))

            return result
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