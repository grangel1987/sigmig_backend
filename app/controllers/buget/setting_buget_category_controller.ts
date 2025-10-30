import SettingBugetCategory from '#models/buget/setting_buget_category'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class SettingBugetCategoryController {
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
            const query = SettingBugetCategory.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })

            const categories = await (page ? query.paginate(page, perPage || 10) : query)
            return categories
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
        const { name } = await request.validateUsing(
            vine.compile(vine.object({ name: vine.string().trim() }))
        )
        const dateTime = DateTime.local()

        try {
            const category = await SettingBugetCategory.create({
                name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await category.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await category.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                category,
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
        const categoryId = params.id
        const { name } = await request.validateUsing(
            vine.compile(vine.object({ name: vine.string().trim().optional() }))
        )
        const dateTime = DateTime.local()

        try {
            const category = await SettingBugetCategory.findOrFail(categoryId)
            category.merge({ name, updatedById: auth.user!.id, updatedAt: dateTime })
            await category.save()

            await category.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await category.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                category,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
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

    public async changeStatus({ params, response, auth, i18n }: HttpContext) {
        const categoryId = params.id
        const dateTime = DateTime.local()

        try {
            const category = await SettingBugetCategory.findOrFail(categoryId)
            const status = !category.enabled
            category.merge({ enabled: status, updatedById: auth.user!.id, updatedAt: dateTime })
            await category.save()

            await category.load('createdBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await category.load('updatedBy', (builder) => {
                builder.preload('personalData', pdQ => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                category,
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_ok'),
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

    public async select({ response, i18n }: HttpContext) {
        try {
            const categories = await SettingBugetCategory.query().where('enabled', true)
            return categories.map((c) => ({ text: c.name, value: c.id }))
        } catch (error) {
            return response.status(500).json({
                ...MessageFrontEnd(
                    i18n.formatMessage('messages.update_error'),
                    i18n.formatMessage('messages.error_title')
                )
            })
        }
    }
}
