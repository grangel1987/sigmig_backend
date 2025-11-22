import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        // Ensure clean pivot table (assumes old version had extra columns like rol/permissions)
        this.schema.alterTable('business_users', (table) => {
            table.dropColumn('rol') // If exists
            table.dropColumn('permissions') // If exists
            table.dropColumn('is_super') // If exists
            table.dropColumn('position_id') // If exists
            table.boolean('selected').defaultTo(false).alter() // Ensure it exists
            table.unique(['business_id', 'user_id'])
        })

        // Migrate old roles to new tables (adjust if your old table name differs)
        this.defer(async (db) => {
            await db.rawQuery(`
              INSERT INTO business_user_rols (business_id, user_id, rol)
              SELECT business_id, user_id, rol FROM business_users WHERE rol IS NOT NULL AND rol != ''
            `)
        })
    }

    async down() {
        // Add back old columns if needed (manual adjustment required for data)
    }
}