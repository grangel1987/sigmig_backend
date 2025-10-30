import SettingBugetItem from '#models/buget/setting_buget_item'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class SettingBugetItemController {
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
            const query = SettingBugetItem.query()
                /*                 .preload('type', (builder) => {
                                    builder.select(['id', 'text'])
                                }) */
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            const items = await (page ? query.paginate(page, perPage || 10) : query)
            return items
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async store({ request, response, auth, i18n }: HttpContext) {
        const { typeId, value, categoryIds, withTitle, title } = await request.validateUsing(
            vine.compile(
                vine.object({
                    typeId: vine.number().positive(),
                    value: vine.string().trim(),
                    categoryIds: vine.array(vine.number().positive()).optional(),
                    withTitle: vine.boolean().optional(),
                    title: vine.string().trim().optional(),
                })
            )
        )

        const dateTime = DateTime.local()

        try {
            const categoriesCsv = (categoryIds || []).join(',') + ',0'

            const item = await SettingBugetItem.create({
                typeId,
                value,
                withTitle: withTitle ?? false,
                title,
                categoryIdsCsv: categoriesCsv,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            // await item.load('type', (builder) => builder.select(['id', 'text']))
            await item.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.store_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async update({ params, request, response, auth, i18n }: HttpContext) {
        const itemId = params.id
        const { typeId, value, categoryIds, withTitle, title } = await request.validateUsing(
            vine.compile(
                vine.object({
                    typeId: vine.number().positive().optional(),
                    value: vine.string().trim().optional(),
                    categoryIds: vine.array(vine.number().positive()).optional(),
                    withTitle: vine.boolean().optional(),
                    title: vine.string().trim().optional(),
                })
            )
        )

        const dateTime = DateTime.local()

        try {
            const item = await SettingBugetItem.findOrFail(itemId)
            const categoriesCsv = categoryIds ? categoryIds.join(',') + ',0' : undefined

            item.merge({
                typeId,
                value,
                withTitle,
                title,
                categoryIdsCsv: categoriesCsv,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await item.save()

            // await item.load('type', (builder) => builder.select(['id', 'text']))
            await item.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {

            console.log(error);

            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async changeStatus({ params, response, auth, i18n }: HttpContext) {
        const itemId = params.id
        const dateTime = DateTime.local()

        try {
            const item = await SettingBugetItem.findOrFail(itemId)
            const status = !item.enabled
            item.merge({ enabled: status, updatedById: auth.user!.id, updatedAt: dateTime })
            await item.save()

            // await item.load('type', (builder) => builder.select(['id', 'text']))
            await item.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await item.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                item,
                ...MessageFrontEnd(
                    i18n.formatMessage(item.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                    i18n.formatMessage('messages.ok_title')
                )
            })
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }

    public async findByType({ params }: HttpContext) {
        const typeId = params.id
        const items = await SettingBugetItem.query()
            .select(['id', 'value'])
            .where('type_id', typeId)
            .where('enabled', true)
        return items
    }

    public async findAll() {
        const items = await SettingBugetItem.query()
            .select(['id', 'type_id', 'value'])
            .where('enabled', true)
        return items
    }
}
