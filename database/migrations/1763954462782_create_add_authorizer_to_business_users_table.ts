import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {

    const hasAuthorizer = await this.schema.hasColumn('business_users', 'is_authorizer')

    if (!hasAuthorizer) {
      this.schema.alterTable('business_users', (table) => {
        table.integer('is_authorizer').defaultTo(0)
      })
    }
  }

  async down() {

    const hasAuthorizer = await this.schema.hasColumn('business_users', 'is_authorizer')

    if (hasAuthorizer) {
      this.schema.alterTable('business_users', (table) => {
        table.dropColumn('is_authorizer')
      })
    }
  }
}