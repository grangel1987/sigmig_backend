import { BaseSchema } from '@adonisjs/lucid/schema'
import Database from '@adonisjs/lucid/services/db'

export default class BackfillNotificationTypeBusinessUsers extends BaseSchema {
    public async up() {
        // Link every notification type to all super business users
        await Database.rawQuery(`
      INSERT INTO notification_type_business_users (notification_type_id, business_user_id, created_at)
      SELECT nt.id, bu.id, NOW()
      FROM notification_types nt
      JOIN business_users bu ON bu.is_super = true
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_type_business_users x
        WHERE x.notification_type_id = nt.id AND x.business_user_id = bu.id
      )
    `)
    }

    public async down() {
        // Optional clean-up: remove pairs where business_user is super (at backfill time semantics unknown)
        // Leaving as no-op to avoid accidental data loss if roles changed later
    }
}
