import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {

    const hasAuthorizer = await this.schema.hasColumn('business_users', 'is_super')

    if (!hasAuthorizer) {
      this.schema.alterTable('business_users', (table) => {
        table.integer('is_super').defaultTo(0)
      })
    }
  }

  async down() {
    const db = this.db
    const hasColumn = async (table: string, column: string) => {
      const result = await db.rawQuery(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, column])
      return result[0].length > 0
    }

    const hasAuthorizer = await hasColumn('business_users', 'is_authorizer')

    if (hasAuthorizer) {
      this.schema.alterTable('business_users', (table) => {
        table.dropColumn('is_authorizer')
      })
    }
  }
}