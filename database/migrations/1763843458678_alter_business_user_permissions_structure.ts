import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBusinessUserPermissionsStructure extends BaseSchema {
  async up() {
    const hasOldRolId = await this.schema.hasColumn('business_user_permissions', 'business_user_rol_id')
    const hasOldPermission = await this.schema.hasColumn('business_user_permissions', 'permission')
    const hasBusinessUserId = await this.schema.hasColumn('business_user_permissions', 'business_user_id')
    const hasPermissionId = await this.schema.hasColumn('business_user_permissions', 'permission_id')
    const hasSignature = await this.schema.hasColumn('business_user_permissions', 'signature')

    const needsAlter = hasOldRolId || hasOldPermission || !hasBusinessUserId || !hasPermissionId || !hasSignature

    if (needsAlter) {
      this.schema.alterTable('business_user_permissions', (table) => {
        if (hasOldRolId) {
          table.dropColumn('business_user_rol_id')
        }
        if (hasOldPermission) {
          table.dropColumn('permission')
        }
        if (!hasBusinessUserId) {
          table.integer('business_user_id').notNullable()
        }
        if (!hasPermissionId) {
          table.integer('permission_id').notNullable()
        }
        if (!hasSignature) {
          table.boolean('signature').defaultTo(false)
        }
      })
    }
  } async down() {
    // Reverse the changes - restore old structure
    this.schema.alterTable('business_user_permissions', (table) => {
      table.dropColumn('business_user_id')
      table.dropColumn('permission_id')
      table.dropColumn('signature')
      table.integer('business_user_rol_id').notNullable()
      table.string('permission', 255).notNullable()
    })
  }
}