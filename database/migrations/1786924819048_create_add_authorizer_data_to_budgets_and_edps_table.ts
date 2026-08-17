import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    const hasEdpsData = await this.schema.hasColumn('budget_edps', 'authorizer_data')
    if (!hasEdpsData) {
      this.schema.alterTable('budget_edps', (table) => {
        table.json('authorizer_data').nullable()
      })
    }

    const hasBugetsData = await this.schema.hasColumn('bugets', 'authorizer_data')
    if (!hasBugetsData) {
      this.schema.alterTable('bugets', (table) => {
        table.json('authorizer_data').nullable()
      })
    }
  }

  async down() {
    this.schema.alterTable('budget_edps', (table) => {
      table.dropColumn('authorizer_data')
    })
    this.schema.alterTable('bugets', (table) => {
      table.dropColumn('authorizer_data')
    })
  }
}