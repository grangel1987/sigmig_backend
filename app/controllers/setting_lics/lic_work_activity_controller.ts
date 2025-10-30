import SettingLicWorkActivity from '#models/setting_lic/setting_lic_work_activity'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { licWorkActivityStoreValidator, licWorkActivityUpdateValidator } from '#validators/setting_lics'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class LicWorkActivityController {
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
            const query = SettingLicWorkActivity.query()
                .preload('createdBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )
                .preload('updatedBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )

            const workActivities = await (page ? query.paginate(page, perPage || 10) : query)

            return workActivities
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
        const data = await request.validateUsing(licWorkActivityStoreValidator)
        const dateTime = DateTime.local()

        try {
            const workActivity = await SettingLicWorkActivity.create({
                name: data.name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await workActivity.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await workActivity.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                workActivity,
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
        const workActivityId = params.id
        const data = await request.validateUsing(licWorkActivityUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const workActivity = await SettingLicWorkActivity.findOrFail(workActivityId)
            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            workActivity.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await workActivity.save()

            await workActivity.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await workActivity.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                workActivity,
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
        const workActivityId = params.id
        const dateTime = DateTime.local()

        try {
            const workActivity = await SettingLicWorkActivity.findOrFail(workActivityId)
            const status = !workActivity.enabled
            workActivity.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await workActivity.save()

            await workActivity.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await workActivity.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                workActivity,
                message: i18n.formatMessage(workActivity.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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
            const workActivities = await SettingLicWorkActivity.query()
                .where('enabled', true)
                .orderBy('id')

            const result = workActivities.map((workActivity) => ({
                text: workActivity.name,
                value: workActivity.id,
            }))

            return response.status(200).json(result)
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