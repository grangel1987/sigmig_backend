import SettingLicMotive from '#models/setting_lic/setting_lic_motive'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { licMotiveStoreValidator, licMotiveUpdateValidator } from '#validators/setting_lics'
import { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingLicMotiveController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request, response, i18n } = ctx
        const { page, perPage } = await request.validateUsing(
            vine.compile(
                vine.object({
                    page: vine.number().positive().optional(),
                    perPage: vine.number().positive().optional(),
                })
            )
        )

        try {
            const query = SettingLicMotive.query()
                .preload('createdBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )
                .preload('updatedBy', (builder) =>
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                )

            const motives = await (page ? query.paginate(page, perPage || 10) : query)

            return motives
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

    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'create');

        const { request, response, auth, i18n } = ctx
        const data = await request.validateUsing(licMotiveStoreValidator)
        const dateTime = DateTime.local()

        try {
            const motive = await SettingLicMotive.create({
                name: data.name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await motive.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await motive.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                motive,
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

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, request, response, auth, i18n } = ctx
        const motiveId = params.id
        const data = await request.validateUsing(licMotiveUpdateValidator)
        const dateTime = DateTime.local()

        try {
            const motive = await SettingLicMotive.findOrFail(motiveId)
            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            motive.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await motive.save()

            await motive.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await motive.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                motive,
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

    public async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, response, auth, i18n } = ctx
        const motiveId = params.id
        const dateTime = DateTime.local()

        try {
            const motive = await SettingLicMotive.findOrFail(motiveId)
            const status = !motive.enabled
            motive.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await motive.save()

            await motive.load('createdBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )
            await motive.load('updatedBy', (builder) =>
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            )

            return response.status(201).json({
                motive,
                message: i18n.formatMessage(motive.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
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

    public async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { response, i18n } = ctx
        try {
            const motives = await SettingLicMotive.query()
                .where('enabled', true)
                .orderBy('id')

            const result = motives.map((motive) => ({
                text: motive.name,
                value: motive.id,
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