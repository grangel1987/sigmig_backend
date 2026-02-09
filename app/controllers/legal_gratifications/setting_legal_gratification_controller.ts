import SettingLegalGratification from '#models/legal_gratifications/setting_legal_gratification'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { indexFiltersWithStatus } from '#validators/general'
import { settingLegalGratificationStoreValidator, settingLegalGratificationUpdateValidator } from '#validators/setting_legal_gratification'
import { HttpContext } from '@adonisjs/core/http'

export default class SettingLegalGratificationController {
    async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { request } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        try {
            const query = SettingLegalGratification.query()
                .preload('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
                .preload('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))

            if (text) {
                const likeVal = `%${text}%`
                query.whereILike('name', likeVal)
            }

            if (status !== undefined) {
                query.where('enabled', status === 'enabled')
            }

            return page ? query.paginate(page, perPage ?? 10) : query
        } catch (error) {
            console.error(error)
            return []
        }
    }

    async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'create');

        const { request, response, auth, i18n } = ctx
        const { name } = await request.validateUsing(settingLegalGratificationStoreValidator)
        const dateTime = await Util.getDateTimes(request)
        try {
            const payload = {
                name,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: dateTime,
                updatedAt: dateTime,
            }
            const legalGrt = await SettingLegalGratification.create(payload)
            await legalGrt.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await legalGrt.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                legalGratification: legalGrt,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { request, params, response, auth, i18n } = ctx
        const id = Number(params.id)
        const { name } = await request.validateUsing(settingLegalGratificationUpdateValidator)
        const dateTime = await Util.getDateTimes(request)
        try {
            const legalGrt = await SettingLegalGratification.findOrFail(id)
            legalGrt.merge({ name, updatedById: auth.user!.id, updatedAt: dateTime })
            await legalGrt.save()
            await legalGrt.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await legalGrt.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                legalGratification: legalGrt,
                ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    async changeStatus(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update');

        const { params, request, response, auth, i18n } = ctx
        const id = Number(params.id)
        const dateTime = await Util.getDateTimes(request)
        try {
            const legalGrt = await SettingLegalGratification.findOrFail(id)
            legalGrt.enabled = !legalGrt.enabled
            legalGrt.updatedById = auth.user!.id
            legalGrt.updatedAt = dateTime
            await legalGrt.save()
            await legalGrt.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await legalGrt.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                legalGratification: legalGrt,
                ...MessageFrontEnd(
                    i18n.formatMessage(legalGrt.enabled ? 'messages.ok_enabled' : 'messages.ok_disabled'),
                    i18n.formatMessage('messages.ok_title')
                ),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json(
                MessageFrontEnd(i18n.formatMessage('messages.update_error'), i18n.formatMessage('messages.error_title'))
            )
        }
    }

    async select(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view');

        const { } = ctx
        const result: { text: string; value: number }[] = []
        const legalGrts = await SettingLegalGratification.query().where('enabled', true).orderBy('id')
        for (const legalGrt of legalGrts) {
            result.push({ text: legalGrt.name, value: legalGrt.id })
        }
        return result
    }
}
