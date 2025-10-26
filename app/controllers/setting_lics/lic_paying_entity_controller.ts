import SettingLicPayingEntity from '#models/setting_lic/setting_lic_paying_entity';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { HttpContext } from '@adonisjs/core/http';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class LicPayingEntityController {
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
            const query = SettingLicPayingEntity.query()
                .preload('createdBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )
                .preload('updatedBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )

            const payingEntities = await (page ? query.paginate(page, perPage || 10) : query)

            return payingEntities
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
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const payingEntity = await SettingLicPayingEntity.create({
                name: data.name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await payingEntity.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await payingEntity.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                payingEntity,
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
        const payingEntityId = params.id
        const data = await request.validateUsing(
            vine.compile(
                vine.object({
                    name: vine.string().trim(),
                })
            )
        )
        const dateTime = DateTime.local()

        try {
            const payingEntity = await SettingLicPayingEntity.findOrFail(payingEntityId)
            payingEntity.merge({
                name: data.name,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await payingEntity.save()

            await payingEntity.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await payingEntity.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                payingEntity,
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
        const payingEntityId = params.id
        const dateTime = DateTime.local()

        try {
            const payingEntity = await SettingLicPayingEntity.findOrFail(payingEntityId)
            const status = !payingEntity.enabled
            payingEntity.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await payingEntity.save()

            await payingEntity.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await payingEntity.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                payingEntity,
                message: i18n.formatMessage(payingEntity.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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
            const payingEntities = await SettingLicPayingEntity.query()
                .where('enabled', true)
                .orderBy('id')

            const result = payingEntities.map((entity) => ({
                text: entity.name,
                value: entity.id,
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