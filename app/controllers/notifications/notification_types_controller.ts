import NotificationType from '#models/notifications/notification_type'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { indexFiltersWithStatus } from '#validators/general'
import { notificationTypeStoreValidator, notificationTypeUpdateValidator } from '#validators/notifications/notification_type'
import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class NotificationTypesController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view')

        const { request } = ctx
        const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

        const query = NotificationType.query()
            .preload('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            .preload('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))

        if (text) {
            const like = `%${text}%`
            query.where((qb) => qb.whereILike('name', like).orWhereILike('code', like).orWhereILike('description', like))
        }
        if (status !== undefined) query.where('enabled', status === 'enabled')

        return page ? query.paginate(page, perPage ?? 10) : query
    }

    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'create')

        const { request, response, auth, i18n } = ctx
        const data = await request.validateUsing(notificationTypeStoreValidator)
        const now = DateTime.local()

        try {
            const t = await NotificationType.create({
                name: data.name,
                code: data.code ?? null,
                description: data.description ?? null,
                enabled: data.enabled ?? true,
                channel: data.channel ?? null,
                severity: data.severity ?? null,
                createdById: auth.user!.id,
                updatedById: auth.user!.id,
                createdAt: now,
                updatedAt: now,
            })
            if (data.businessUsers?.length) await t.related('businessUsers').sync(data.businessUsers)
            if (data.rols?.length) await t.related('rols').sync(data.rols)
            await t.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            await t.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData'))
            return response.status(201).json({
                type: t,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json({
                ...MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')),
            })
        }
    }

    public async update(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update')

        const { request, response, params, i18n, auth } = ctx
        const id = Number(params.id)
        const data = await request.validateUsing(notificationTypeUpdateValidator)
        const t = await NotificationType.findOrFail(id)

        t.name = data.name ?? t.name
        t.code = data.code ?? t.code
        t.description = data.description ?? t.description
        t.enabled = data.enabled ?? t.enabled
        t.channel = data.channel ?? t.channel
        t.severity = data.severity ?? t.severity
        t.updatedById = auth.user!.id
        await t.save()

        if (data.businessUsers) await t.related('businessUsers').sync(data.businessUsers)
        if (data.rols) await t.related('rols').sync(data.rols)

        return response.status(200).json({
            type: t,
            ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
        })
    }
}
