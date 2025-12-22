import Notification from '#models/notifications/notification'
import NotificationService from '#services/notification_service'
import PermissionService from '#services/permission_service'
import { default as messageFrontEnd, default as MessageFrontEnd } from '#utils/MessageFrontEnd'
import { notificationIndexValidator, notificationStoreValidator } from '#validators/notifications/notification'
import { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

export default class NotificationsController {
    public async my(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'view')

        const { request, response, auth } = ctx
        const { page, perPage, status } = await request.validateUsing(notificationIndexValidator)
        const headerBusinessIdRaw = request.header('Business')
        const businessId = headerBusinessIdRaw ? Number(headerBusinessIdRaw) : undefined
        const activeBusinessUser = businessId
            ? await auth.user!.related('businessUser').query().where('business_id', businessId).first()
            : await auth.user!.related('selectedBusiness').query().first()
        const businessUserId = activeBusinessUser?.id ?? 0

        let query = Notification.query()
        const filterBusinessId = businessId ?? activeBusinessUser?.businessId
        if (filterBusinessId) {
            query = query.where('business_id', filterBusinessId)
        }
        query = query
            .whereHas('recipients', (b) => b.where('business_user_id', businessUserId).if(status, (qb) => qb.where('status', status!)))
            .preload('type')
            .preload('recipients', (b) => b.where('business_user_id', businessUserId))
            .orderBy('id', 'desc')


        if (page) {
            const pagRes = await query.paginate(page, perPage ?? 10)

            const serializedNotifications = pagRes.all().map((notification) => {
                const serializedNot = { ...notification.serialize(), status: notification.recipients[0]?.status } as any
                delete serializedNot.recipients
                return serializedNot
            })
            return response.ok({ ...pagRes.getMeta(), data: serializedNotifications })


        } else {
            const res = await query

            const serializedNotifications = res.map((notification) => {
                const serializedNot = { ...notification.serialize(), status: notification.recipients[0]?.status } as any
                delete serializedNot.recipients
                return serializedNot
            })
            return response.ok(serializedNotifications)
        }
    }

    public async store(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'create')

        const { request, response, auth, i18n } = ctx
        const data = await request.validateUsing(notificationStoreValidator)

        try {
            const notification = await NotificationService.createAndDispatch({
                typeId: data.notificationTypeId ?? undefined,
                businessId: data.businessId ?? undefined,
                title: data.title,
                body: data.body ?? undefined,
                payload: data.payload ?? undefined,
                createdById: auth.user!.id,
                recipientBusinessUserIds: data.recipientBusinessUserIds ?? undefined,
            })

            await notification.load('type')
            return response.status(201).json({
                notification,
                ...MessageFrontEnd(i18n.formatMessage('messages.store_ok'), i18n.formatMessage('messages.ok_title')),
            })
        } catch (error) {
            console.error(error)
            return response.status(500).json({
                ...MessageFrontEnd(i18n.formatMessage('messages.store_error'), i18n.formatMessage('messages.error_title')),
            })
        }
    }

    public async markRead(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update')

        const { params, auth, request } = ctx
        const id = Number(params.id)
        const headerBusinessIdRaw = request.header('Business')
        const businessId = headerBusinessIdRaw ? Number(headerBusinessIdRaw) : undefined
        const activeBusinessUser = businessId
            ? await auth.user!.related('businessUser').query().where('business_id', businessId).first()
            : await auth.user!.related('selectedBusiness').query().first()
        const businessUserId = activeBusinessUser?.id ?? 0
        const updated = await NotificationService.markAsRead(id, businessUserId)
        return updated
    }

    public async delete(ctx: HttpContext) {
        await PermissionService.requirePermission(ctx, 'settings', 'update')

        const { params, response, auth, i18n, request } = ctx
        const id = Number(params.id)
        const headerBusinessIdRaw = request.header('Business')
        const businessId = headerBusinessIdRaw ? Number(headerBusinessIdRaw) : undefined
        const activeBusinessUser = businessId
            ? await auth.user!.related('businessUser').query().where('business_id', businessId).first()
            : await auth.user!.related('selectedBusiness').query().first()
        const businessUserId = activeBusinessUser?.id ?? 0
        await db.from('notification_users').where('notification_id', id).andWhere('business_user_id', businessUserId).delete()
        return response.ok({ ...messageFrontEnd(i18n.formatMessage('messages.delete_ok'), i18n.formatMessage('messages.ok_title')) })
    }
}
