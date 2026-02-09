import NotificationType from '#models/notifications/notification_type'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'

export default class extends BaseSeeder {
    public async run() {
        const trx = await db.transaction()
        try {
            const nowUserId = 1 // Seeded as system user id placeholder

            const types = [
                {
                    name: 'Cotización creada',
                    code: 'budget_created',
                    description: 'Notifica creación de una nueva cotización',
                    enabled: true,
                    channel: 'in_app',
                    severity: 'info',
                    createdById: nowUserId,
                    updatedById: nowUserId,
                },
                {
                    name: 'Estado de cotización actualizado',
                    code: 'budget_status_changed',
                    description: 'Notifica cambios de estado en una cotización',
                    enabled: true,
                    channel: 'in_app',
                    severity: 'info',
                    createdById: nowUserId,
                    updatedById: nowUserId,
                },
                {
                    name: 'Orden de compra creada',
                    code: 'shopping_created',
                    description: 'Notifica creación de una nueva orden de compra',
                    enabled: true,
                    channel: 'in_app',
                    severity: 'info',
                    createdById: nowUserId,
                    updatedById: nowUserId,
                },
                {
                    name: 'Orden de compra autorizada',
                    code: 'shopping_authorized',
                    description: 'Notifica autorización de una orden de compra',
                    enabled: true,
                    channel: 'in_app',
                    severity: 'info',
                    createdById: nowUserId,
                    updatedById: nowUserId,
                },
            ]

            for (const type of types) {
                await NotificationType.updateOrCreate(
                    { code: type.code },
                    type,
                    { client: trx }
                )
            }

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }
}
