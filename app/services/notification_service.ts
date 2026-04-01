import Notification from '#models/notifications/notification'
import NotificationBusinessUser from '#models/notifications/notification_business_user'
import ws from '#services/ws'
import { notifRoomForUser } from '#start/socket'
import logger from '@adonisjs/core/services/logger'
import Database from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class NotificationService {
  /** Resolve recipients for a notification type: business_users directly assigned and via roles */
  static async resolveRecipientsForType(typeId: number, businessId?: number): Promise<number[]> {
    const businessUserIds: number[] = []

    let directQuery = Database.from('notification_type_business_users')
      .where('notification_type_id', typeId)
      .join(
        'business_users',
        'notification_type_business_users.business_user_id',
        'business_users.id'
      )
      .select('business_users.id as business_user_id')
    if (businessId) {
      directQuery = directQuery.where('business_users.business_id', businessId)
    }

    const direct = await directQuery
    logger.info('notification_service.resolveRecipientsForType: direct recipients resolved', {
      typeId,
      businessId: businessId ?? null,
      count: direct.length,
    })
    for (const u of direct) businessUserIds.push(u.business_user_id)

    const rolRows = await Database.from('notification_type_rols').where(
      'notification_type_id',
      typeId
    )
    const rolIds = rolRows.map((r) => r.rol_id)
    logger.info('notification_service.resolveRecipientsForType: roles resolved', {
      typeId,
      businessId: businessId ?? null,
      count: rolIds.length,
      roleIds: rolIds,
    })

    if (rolIds.length) {
      let query = Database.from('business_user_rols').whereIn('rol_id', rolIds)
      query = query.join(
        'business_users',
        'business_user_rols.business_user_id',
        'business_users.id'
      )
      if (businessId) {
        query = query.where('business_users.business_id', businessId)
      }

      query = query.select('business_users.id as business_user_id')
      const rows = await query
      logger.info('notification_service.resolveRecipientsForType: role recipients resolved', {
        typeId,
        businessId: businessId ?? null,
        count: rows.length,
      })
      for (const row of rows) businessUserIds.push(row.business_user_id)
    }

    const uniqueRecipients = [...new Set(businessUserIds)]
    logger.info('notification_service.resolveRecipientsForType: total recipients resolved', {
      typeId,
      businessId: businessId ?? null,
      count: uniqueRecipients.length,
      recipientBusinessUserIds: uniqueRecipients,
    })

    return uniqueRecipients
  }

  /** Create a notification and attach recipients */
  static async createAndDispatch(params: {
    typeId?: number
    businessId?: number
    title: string
    body?: string
    payload?: Record<string, any>
    meta?: Record<string, any>
    createdById: number
    recipientBusinessUserIds?: number[]
  }) {
    logger.info('notification_service.createAndDispatch: creating notification', {
      typeId: params.typeId ?? null,
      businessId: params.businessId ?? null,
      title: params.title,
      createdById: params.createdById,
      explicitRecipientsCount: params.recipientBusinessUserIds?.length ?? 0,
    })

    let recipients: number[] = params.recipientBusinessUserIds ?? []
    if (!recipients.length && params.typeId) {
      logger.info('notification_service.createAndDispatch: resolving recipients from type', {
        typeId: params.typeId,
        businessId: params.businessId ?? null,
      })
      recipients = await this.resolveRecipientsForType(params.typeId, params.businessId)
    }

    recipients = [...new Set(recipients.map((recipient) => Number(recipient)).filter(Boolean))]

    logger.info('notification_service.createAndDispatch: recipients ready', {
      count: recipients.length,
      recipientBusinessUserIds: recipients,
    })

    const trx = await Database.transaction()
    let notification: Notification

    try {
      notification = new Notification()
      notification.useTransaction(trx)
      notification.notificationTypeId = params.typeId ?? null
      notification.businessId = params.businessId ?? null
      notification.title = params.title
      notification.body = params.body ?? null
      notification.payload = params.payload ?? null
      notification.meta = params.meta ?? null
      notification.createdById = params.createdById

      await notification.save()

      logger.info('notification_service.createAndDispatch: notification created', {
        notificationId: notification.id,
        typeId: notification.notificationTypeId,
        businessId: notification.businessId,
      })

      if (recipients.length) {
        const now = DateTime.now().toFormat('yyyy-LL-dd HH:mm:ss')
        await trx.table('notification_users').multiInsert(
          recipients.map((businessUserId) => ({
            notification_id: notification.id,
            business_user_id: businessUserId,
            status: 'unread',
            delivered_at: now,
            created_at: now,
          }))
        )

        logger.info('notification_service.createAndDispatch: notification recipients persisted', {
          notificationId: notification.id,
          count: recipients.length,
        })
      } else {
        logger.warn('notification_service.createAndDispatch: no recipients resolved', {
          notificationId: notification.id,
          typeId: params.typeId ?? null,
          businessId: params.businessId ?? null,
        })
      }

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      logger.error('notification_service.createAndDispatch: database persistence failed', {
        typeId: params.typeId ?? null,
        businessId: params.businessId ?? null,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }

    if (recipients.length) {
      try {
        await notification.load('type')

        const payload = {
          id: notification.id,
          title: notification.title,
          body: notification.body,
          typeId: notification.notificationTypeId,
          type: notification.type,
          businessId: notification.businessId,
          payload: notification.payload,
          meta: notification.meta,
          createdAt: notification.createdAt.toFormat('yyyy-MM-dd HH:mm:ss'),
          status: 'unread' as const,
        }

        if (!ws.io) {
          logger.warn('notification_service.createAndDispatch: socket server unavailable', {
            notificationId: notification.id,
            recipientsCount: recipients.length,
          })
          return notification
        }

        const users = await Database.from('business_users')
          .whereIn('id', recipients)
          .select('id', 'user_id')

        const validUsers = users.filter((user) => Number(user.user_id) > 0)
        const skippedUsers = users.filter((user) => !Number(user.user_id))

        logger.info('notification_service.createAndDispatch: socket targets resolved', {
          notificationId: notification.id,
          users: validUsers.map((user) => ({ businessUserId: user.id, userId: user.user_id })),
        })

        if (skippedUsers.length) {
          logger.warn(
            'notification_service.createAndDispatch: socket targets skipped due to missing user_id',
            {
              notificationId: notification.id,
              skippedUsers: skippedUsers.map((user) => ({
                businessUserId: user.id,
                userId: user.user_id,
              })),
            }
          )
        }

        for (const r of validUsers) {
          const room = notifRoomForUser(r.user_id)
          ws.io?.to(room).emit('notifications/new', payload)

          logger.info('notification_service.createAndDispatch: socket notification emitted', {
            notificationId: notification.id,
            businessUserId: r.id,
            userId: r.user_id,
            room,
          })
        }
      } catch (emitErr) {
        logger.error('notification_service.createAndDispatch: socket emit failed', {
          notificationId: notification.id,
          error: emitErr instanceof Error ? emitErr.message : emitErr,
          stack: emitErr instanceof Error ? emitErr.stack : undefined,
        })
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
