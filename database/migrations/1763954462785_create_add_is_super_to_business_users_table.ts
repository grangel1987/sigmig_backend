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


    const hasAuthorizer = await this.schema.hasColumn('business_users', 'is_super')

    if (hasAuthorizer) {
      this.schema.alterTable('business_users', (table) => {
        table.dropColumn('is_super')
      })
    }
  }
}