import BusinessUser from '#models/business/business_user'
import NotificationType from '#models/notifications/notification_type'
import PermissionService from '#services/permission_service'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import { searchWithStatusSchema } from '#validators/general'
import { notificationTypeStoreValidator, notificationTypeUpdateValidator } from '#validators/notifications/notification_type'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export default class NotificationTypesController {
    public async index(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view')

        const { request } = ctx
        const { page, perPage, text, status, roleId } =
            await request.validateUsing(
                vine.compile(vine.object({
                    ...searchWithStatusSchema.getProperties(),
                    roleId: vine.number().positive().optional()
                })))

        const query = NotificationType.query()
            .preload('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData', pdQ => pdQ.select(['names', 'last_name_p', 'last_name_m'])))
            .preload('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData', pdQ => pdQ.select(['names', 'last_name_p', 'last_name_m'])))

        if (text) {
            const like = `%${text}%`
            query.where((qb) => qb.whereILike('name', like).orWhereILike('code', like).orWhereILike('description', like))
        }
        if (status !== undefined) query.where('enabled', status === 'enabled')

        // If roleId provided, limit types to those associated to the role via notification_type_rols
        if (roleId) {
            const rows = await db.from('notification_type_rols').where('rol_id', roleId).select('notification_type_id')
            const ids = rows.map((r: any) => Number(r.notification_type_id))
            if (ids.length) query.whereIn('id', ids)
            else query.whereRaw('1 = 0')
        }

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
            await t.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData', pdQ => pdQ.select(['names', 'last_name_p', 'last_name_m'])))
            await t.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData', pdQ => pdQ.select(['names', 'last_name_p', 'last_name_m'])))
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

        await t.load('createdBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData', pdQ => pdQ.select(['names', 'last_name_p', 'last_name_m'])))
        await t.load('updatedBy', (b) => b.select(['id', 'personal_data_id', 'email']).preload('personalData', pdQ => pdQ.select(['names', 'last_name_p', 'last_name_m'])))

        return response.status(200).json({
            type: t,
            ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
        })
    }

    /** Assign business users to a notification type (admin or super of the business) */
    public async assignUserNotificationTypes(ctx: HttpContext) {
        const { request, response, auth, i18n } = ctx

        const payload = await request.validateUsing(
            vine.compile(
                vine.object({
                    notificationTypeIds: vine.array(vine.number().positive().exists({ table: 'notification_types', column: 'id' })).minLength(1),
                    params: vine.object({
                        id: vine.number().positive().exists({ table: 'business_users', column: 'id' }),
                    })
                }
                )
            ))

        const isAdmin = auth.user?.isAdmin

        // Determine business scope
        const businessId = request.header('Business')

        if (!isAdmin && !businessId) {
            return response.status(403).json(
                MessageFrontEnd(
                    i18n.formatMessage('messages.no_authorizer_permission'),
                    i18n.formatMessage('messages.error_title')
                )
            )
        }

        // If not admin, must be super of the scoped business
        if (!isAdmin && businessId) {
            const bu = await BusinessUser.query()
                .where('user_id', auth.user!.id)
                .where('business_id', businessId)
                .where('is_super', true)
                .first()
            if (!bu) {
                return response.status(403).json(
                    MessageFrontEnd(
                        i18n.formatMessage('messages.no_authorizer_permission'),
                        i18n.formatMessage('messages.error_title')
                    )
                )
            }
        }

        const businessUserId = payload.params.id

        const bizUser = await BusinessUser.findOrFail(businessUserId)

        const notificationTypeIds = payload.notificationTypeIds
        await bizUser.related('notificationTypes').sync(notificationTypeIds, true)


        return response.status(200).json({
            businessUser: bizUser.id,
            attached: notificationTypeIds,
            ...MessageFrontEnd(i18n.formatMessage('messages.update_ok'), i18n.formatMessage('messages.ok_title')),
        })
    }
}
