import { BaseSchema } from '@adonisjs/lucid/schema'
import Database from '@adonisjs/lucid/services/db'

export default class BackfillNotificationSuperBusinessUsers extends BaseSchema {
    public async up() {
        // Associate all is_super business_users with notifications of their business
        await Database.rawQuery(`
      INSERT INTO notification_users (notification_id, business_user_id, status, delivered_at, created_at)
      SELECT n.id, bu.id, 'unread', n.created_at, n.created_at
      FROM notifications n
      JOIN business_users bu ON bu.business_id = n.business_id AND bu.is_super = true
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_users nu
        WHERE nu.notification_id = n.id AND nu.business_user_id = bu.id
      )
    `)
    }

    public async down() {
        // No-op: data backfill; revert not guaranteed safe in all cases
    }
}
