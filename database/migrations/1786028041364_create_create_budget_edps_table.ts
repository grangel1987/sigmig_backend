import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'budget_edps'

  async up() {
    this.schema.dropTableIfExists(this.tableName)
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('budget_id').references('id').inTable('bugets').onDelete('CASCADE')
      table.integer('edp_number').notNullable()
      table.string('name').nullable()
      table.decimal('percentage', 5, 4).notNullable()
      table.decimal('amount', 14, 2).notNullable().defaultTo(0)
      table.date('due_date').nullable()
      table.enum('status', ['pending', 'partial', 'paid']).defaultTo('pending')

      table.timestamp('created_at')
      table.timestamp('updated_at')
      table.timestamp('deleted_at').nullable()
      table.integer('deleted_by').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}