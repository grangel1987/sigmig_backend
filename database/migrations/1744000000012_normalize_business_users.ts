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
        const hasPositionId = await hasColumn('business_users', 'position_id')
        const hasAuthorizer = await hasColumn('business_users', 'is_authorizer')
        const hasSelected = await hasColumn('business_users', 'selected')
        const hasUnique = (await db.rawQuery(`SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_users' AND CONSTRAINT_NAME = 'business_users_business_id_user_id_unique' AND CONSTRAINT_TYPE = 'UNIQUE'`))[0].length > 0

        // Remove duplicates before adding unique
        if (!hasUnique) {
            await db.rawQuery(`
            DELETE FROM business_users
            WHERE id NOT IN (
              SELECT MAX(id)
              FROM (SELECT * FROM business_users) AS temp
              GROUP BY business_id, user_id
            )
          `)
        }        // Ensure clean pivot table (assumes old version had extra columns like rol/permissions)
        this.schema.alterTable('business_users', (table) => {
            if (hasRol) table.string('rol').nullable().alter() // Make rol optional instead of dropping
            if (hasPermissions) table.dropColumn('permissions')
            // Keep is_super and authorizer fields - do not drop
            if (!hasAuthorizer) {
                table.tinyint('is_authorizer').defaultTo(0)
            }
            if (hasPositionId) table.dropColumn('position_id')

            if (hasSelected) {
                table.boolean('selected').defaultTo(false).alter()
            } else {
                table.boolean('selected').defaultTo(false)
            }
            if (!hasUnique) table.unique(['business_id', 'user_id'])
        })

        // Migration of roles is handled by the earlier migration 1744000000010
    }

    async down() {
        // Add back old columns if needed (manual adjustment required for data)
    }
}