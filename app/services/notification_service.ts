import Notification from '#models/notifications/notification'
import NotificationBusinessUser from '#models/notifications/notification_business_user'
import ws from '#services/ws'
import { notifRoomForUser } from '#start/socket'
import Database from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class NotificationService {
    /** Resolve recipients for a notification type: business_users directly assigned and via roles */
    static async resolveRecipientsForType(typeId: number, businessId?: number): Promise<number[]> {
        const businessUserIds: number[] = []

        // Direct business_users assigned to the type, limited by business when provided
        let directQuery = Database.from('notification_type_business_users')
            .where('notification_type_id', typeId)
            .join('business_users', 'notification_type_business_users.business_user_id', 'business_users.id')
            .select('business_users.id as business_user_id')
        if (businessId) {
            directQuery = directQuery.where('business_users.business_id', businessId)
        }
        const direct = await directQuery
        console.log(`Direct business_users for type ${typeId}:`, direct.length)
        for (const u of direct) businessUserIds.push(u.business_user_id)

        const rolRows = await Database.from('notification_type_rols').where('notification_type_id', typeId)
        const rolIds = rolRows.map((r) => r.rol_id)
        console.log(`Roles for type ${typeId}:`, rolIds.length, rolIds)
        if (rolIds.length) {
            // Find business_users via roles, optionally filtered by business
            let query = Database.from('business_user_rols').whereIn('rol_id', rolIds)
            query = query.join('business_users', 'business_user_rols.business_user_id', 'business_users.id')
            if (businessId) {
                query = query.where('business_users.business_id', businessId)
            }
            query = query.select('business_users.id as business_user_id')
            const rows = await query
            console.log(`Business_users via roles for type ${typeId}:`, rows.length)
            for (const row of rows) businessUserIds.push(row.business_user_id)
        }

        const uniqueRecipients = [...new Set(businessUserIds)]
        console.log(`Total unique recipients for type ${typeId}:`, uniqueRecipients.length)
        return uniqueRecipients
    }

    /** Create a notification and attach recipients */
    static async createAndDispatch(params: {
        typeId?: number
        businessId?: number
        title: string
        body?: string
        payload?: any
        createdById: number
        recipientBusinessUserIds?: number[]
    }) {
        const notification = await Notification.create({
            notificationTypeId: params.typeId ?? null,
            businessId: params.businessId ?? null,
            title: params.title,
            body: params.body ?? null,
            payload: params.payload ?? null,
            createdById: params.createdById,
        })

        let recipients: number[] = params.recipientBusinessUserIds ?? []
        if (!recipients.length && params.typeId) {
            console.log(`Resolving recipients for typeId=${params.typeId}, businessId=${params.businessId}`)
            recipients = await this.resolveRecipientsForType(params.typeId, params.businessId)
        }

        if (recipients.length) {
            const now = DateTime.now()
            await NotificationBusinessUser.createMany(
                recipients.map((businessUserId) => ({
                    notificationId: notification.id,
                    businessUserId,
                    status: 'unread' as const,
                    deliveredAt: now,
                    createdAt: now,
                }))
            )

            // Emit socket events to user rooms
            try {
                // lightweight payload for clients
                const payload = {
                    id: notification.id,
                    title: notification.title,
                    body: notification.body,
                    typeId: notification.notificationTypeId,
                    businessId: notification.businessId,
                    payload: notification.payload,
                    createdAt: notification.createdAt,
                    status: 'unread' as const,
                }
                // Map business_user_id -> user_id for socket rooms
                const users = await Database.from('business_users')
                    .whereIn('id', recipients)
                    .select('id', 'user_id')
                for (const r of users) {
                    const room = notifRoomForUser(r.user_id)
                    ws.io?.to(room).emit('notifications/new', payload)
                }
            } catch (emitErr) {
                console.log('Notification socket emit error:', emitErr)
                throw emitErr
            }
        }

        return notification
    }

    static async markAsRead(notificationId: number, businessUserId: number) {
        const row = await NotificationBusinessUser.findBy({ notificationId, businessUserId })
        if (!row) return null
        row.status = 'read'
        row.readAt = DateTime.now()
        await row.save()
        return row
    }
}
