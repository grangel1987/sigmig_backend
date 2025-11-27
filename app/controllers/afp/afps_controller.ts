import SettingAfp from '#models/afp';
import PermissionService from '#services/permission_service';
import MessageFrontEnd from '#utils/MessageFrontEnd';
import { afpStoreValidator, afpUpdateValidator } from '#validators/afp';
import { HttpContext } from '@adonisjs/core/http';
import db from '@adonisjs/lucid/services/db';
import vine from '@vinejs/vine';
import { DateTime } from 'luxon';

type MessageFrontEndType = {
    message: string
    title: string
}

export default class SettingAfpController {
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
            const query = SettingAfp.query()
                .preload('createdBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .preload('updatedBy', (builder) => {
                    builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
                })
                .orderBy('id', 'asc')

            const afps = await (page ? query.paginate(page, perPage || 10) : query)

            return afps
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
        const data = await request.validateUsing(afpStoreValidator)
        const dateTime = DateTime.local()

        try {
            const afp = await SettingAfp.create({
                name: data.name,
                code: data.code,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            })

            await afp.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await afp.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                afp,
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
        const afpId = params.id
        const data = await request.validateUsing(afpUpdateValidator)
        const dateTime = DateTime.local()

        try {
            let existing: any = null
            if (data.code) {
                existing = await db.from('setting_afps')
                    .whereNot('id', afpId)
                    .where('code', data.code)
                    .first()
            }

            if (existing) {
                return response.status(500).json({
                    ...MessageFrontEnd(
                        i18n.formatMessage('messages.exists_code'),
                        i18n.formatMessage('messages.error_title')
                    ),
                })
            }

            const afp = await SettingAfp.findOrFail(afpId)
            const payload: Record<string, unknown> = {}
            if (data.name !== undefined) payload.name = data.name
            if (data.code !== undefined) payload.code = data.code
            afp.merge({
                ...payload,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await afp.save()

            await afp.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await afp.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                afp,
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
        const afpId = params.id
        const dateTime = DateTime.local()

        try {
            const afp = await SettingAfp.findOrFail(afpId)
            const status = !afp.enabled
            afp.merge({
                enabled: status,
                updatedById: auth.user!.id,
                updatedAt: dateTime,
            })
            await afp.save()

            await afp.load('createdBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })
            await afp.load('updatedBy', (builder) => {
                builder.preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m')).select(['id', 'personal_data_id', 'email'])
            })

            return response.status(201).json({
                afp,
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

    public async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { response, i18n } = ctx
        try {
            const afps = await SettingAfp.query()
                .where('enabled', true)
                .orderBy('id', 'asc')

            const result = afps.map((afp) => ({
                text: `${afp.code} - ${afp.name}`,
                value: afp.id,
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