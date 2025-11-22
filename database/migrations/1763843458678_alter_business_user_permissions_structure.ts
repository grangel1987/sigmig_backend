import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterBusinessUserPermissionsStructure extends BaseSchema {
  async up() {
    // Alter business_user_permissions table to use business_user_id instead of business_user_rol_id
    this.schema.alterTable('business_user_permissions', (table) => {
      table.dropColumn('business_user_rol_id')
      table.dropColumn('permission')
      table.integer('business_user_id').notNullable()
      table.integer('permission_id').notNullable()
      table.boolean('signature').defaultTo(false)
    })
  }

  async down() {
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