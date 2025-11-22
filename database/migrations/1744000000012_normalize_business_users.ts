import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    async up() {
        const db = this.db
        const hasColumn = async (table: string, column: string) => {
            const result = await db.rawQuery(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column])
            return result[0].length > 0
        }

        const hasRol = await hasColumn('business_users', 'rol')
        const hasPermissions = await hasColumn('business_users', 'permissions')
        const hasIsSuper = await hasColumn('business_users', 'is_super')
        const hasPositionId = await hasColumn('business_users', 'position_id')
        const hasSelected = await hasColumn('business_users', 'selected')
        const hasUnique = (await db.rawQuery(`SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_users' AND CONSTRAINT_NAME = 'business_users_business_id_user_id_unique' AND CONSTRAINT_TYPE = 'UNIQUE'`))[0].length > 0

        // Remove duplicates before adding unique
        if (!hasUnique) {
            await db.rawQuery(`
            DELETE bu1 FROM business_users bu1
            INNER JOIN business_users bu2
            WHERE bu1.business_id = bu2.business_id
              AND bu1.user_id = bu2.user_id
              AND bu1.id < bu2.id
          `)
        }

        // Ensure clean pivot table (assumes old version had extra columns like rol/permissions)
        this.schema.alterTable('business_users', (table) => {
            if (hasRol) table.string('rol').nullable().alter() // Make rol optional instead of dropping
            if (hasPermissions) table.dropColumn('permissions')
            if (hasIsSuper) table.dropColumn('is_super')
            if (hasPositionId) table.dropColumn('position_id')
            if (hasSelected) {
                table.boolean('selected').defaultTo(false).alter()
            } else {
                table.boolean('selected').defaultTo(false)
            }
            if (!hasUnique) table.unique(['business_id', 'user_id'])
        })

        // Migrate old roles to new tables
        this.defer(async (db) => {
            // Get unique roles and create them in rols table
            const rolesResult = await db.rawQuery(`SELECT DISTINCT rol FROM business_users WHERE rol IS NOT NULL AND rol != ''`)
            for (const row of rolesResult[0]) {
                const existing = await db.rawQuery(`SELECT id FROM rols WHERE name = ?`, [row.rol])
                if (existing[0].length === 0) {
                    await db.rawQuery(`INSERT INTO rols (name, description, is_system, enabled, created_by, updated_by, created_at, updated_at) VALUES (?, ?, 0, 1, 1, 1, NOW(), NOW())`, [row.rol, `Migrated role: ${row.rol}`])
                }
            }

            // Insert into business_user_rols
            await db.rawQuery(`
                INSERT INTO business_user_rols (business_user_id, rol_id, signature)
                SELECT bu.id, r.id, 0
                FROM business_users bu
                JOIN rols r ON r.name COLLATE utf8mb4_general_ci = bu.rol
                WHERE bu.rol IS NOT NULL AND bu.rol != ''
            `)
        })
    }

    async down() {
        // Add back old columns if needed (manual adjustment required for data)
    }
}