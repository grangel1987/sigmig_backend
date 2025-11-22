import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class EnhancedNormalizeBusinessUsers extends BaseSchema {
    async up() {
        // Alter business_user_permissions to new structure if needed
        const hasOldPermStructure = await this.schema.hasColumn('business_user_permissions', 'business_user_rol_id')
        if (hasOldPermStructure) {
            this.schema.alterTable('business_user_permissions', (table) => {
                table.dropColumn('business_user_rol_id')
                table.dropColumn('permission')
                table.integer('business_user_id').notNullable()
                table.integer('permission_id').notNullable()
                table.boolean('signature').defaultTo(false)
            })
        }

        // First, ensure the business_users table has the correct structure
        const hasOldColumns = await this.schema.hasColumn('business_users', 'rol_id')

        if (hasOldColumns) {
            // Migrate from old flat structure to new relational structure
            await this.migrateFromOldStructure()
        } else {
            // Ensure clean pivot table structure
            await this.ensureCleanStructure()
        }
    }

    private async migrateFromOldStructure() {
        const trx = await db.transaction()

        try {
            // Step 1: Get all unique roles from old business_users
            const uniqueRoles = await trx
                .from('business_users')
                .select('rol_id')
                .whereNotNull('rol_id')
                .where('rol_id', '!=', '')
                .distinct()

            // Step 2: Create roles in rols table
            for (const roleData of uniqueRoles) {
                const roleName = roleData.rol

                // Check if role already exists
                const existingRole = await trx
                    .from('rols')
                    .where('name', roleName)
                    .first()

                if (!existingRole) {
                    await trx.table('rols').insert({
                        name: roleName,
                        description: `Auto-migrated role: ${roleName}`,
                        is_system: false,
                        enabled: true,
                        created_by: 1, // System user
                        updated_by: 1,
                        created_at: new Date(),
                        updated_at: new Date()
                    })
                }
            }

            // Step 3: Create business_user_rols entries
            const businessUsers = await trx
                .from('business_users')
                .select('business_id', 'user_id', 'rol_id')
                .whereNotNull('rol_id')
                .where('rol_id', '!=', '')

            for (const bu of businessUsers) {
                const role = await trx
                    .from('rols')
                    .where('name', bu.rol)
                    .first()

                if (role) {
                    // Check if relationship already exists
                    const existingRelation = await trx
                        .from('business_user_rols')
                        .where('business_user_id', bu.user_id) // Adjust based on your actual structure
                        .where('rol_id', role.id)
                        .first()

                    if (!existingRelation) {
                        await trx.table('business_user_rols').insert({
                            business_user_id: bu.user_id, // This might need adjustment
                            rol_id: role.id,
                            signature: bu.is_super || false
                        })
                    }
                }
            }

            // Step 4: Migrate permissions if they exist as text field
            const hasPermissionsColumn = await this.schema.hasColumn('business_users', 'permissions')

            if (hasPermissionsColumn) {
                await this.migratePermissions(trx)
            }

            // Step 5: Clean up old columns
            this.schema.alterTable('business_users', (table) => {
                table.dropColumn('rol_id')
                table.dropColumn('permissions')
                table.dropColumn('is_super')
                table.dropColumn('position_id')
                table.boolean('selected').defaultTo(false).alter()
            })

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    private async migratePermissions(trx: any) {
        // This is a simplified migration - you might need to adjust based on your actual permission format
        const usersWithPermissions = await trx
            .from('business_users')
            .select('id', 'user_id', 'permissions')
            .whereNotNull('permissions')
            .where('permissions', '!=', '')

        for (const user of usersWithPermissions) {
            try {
                // Assuming permissions is a JSON string or comma-separated list
                let permissions: string[] = []

                if (user.permissions.startsWith('[')) {
                    // JSON array
                    permissions = JSON.parse(user.permissions)
                } else {
                    // Comma-separated
                    permissions = user.permissions.split(',').map((p: string) => p.trim())
                }

                // Create or get permissions in permissions table
                for (const permKey of permissions) {
                    if (!permKey) continue

                    let permission = await trx
                        .from('permissions')
                        .where('key', permKey)
                        .first()

                    if (!permission) {
                        const [insertedId] = await trx.table('permissions').insert({
                            key: permKey,
                            description: `Auto-migrated permission: ${permKey}`,
                            type: 'system',
                            created_at: new Date(),
                            updated_at: new Date()
                        })
                        permission = { id: insertedId }
                    }

                    // Add to business_user_permissions
                    if (permission) {
                        await trx.table('business_user_permissions').insert({
                            business_user_id: user.id,
                            permission_id: permission.id,
                            signature: false
                        })
                    }
                }
            } catch (error) {
                console.warn(`Failed to migrate permissions for user ${user.user_id}:`, error)
                // Continue with other users
            }
        }
    }

    private async ensureCleanStructure() {
        // Just ensure the table has the correct structure
        this.schema.alterTable('business_users', (table) => {
            table.boolean('selected').defaultTo(false).alter()
            table.unique(['business_id', 'user_id'])
        })
    }

    async down() {
        // Note: Down migration would be complex and potentially destructive
        // We'll make it a no-op to avoid data loss
        console.warn('Down migration for business_users normalization is a no-op to prevent data loss')
    }
}