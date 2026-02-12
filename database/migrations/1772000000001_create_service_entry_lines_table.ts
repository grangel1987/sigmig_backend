import { BaseSchema } from '@adonisjs/lucid/schema'

export default class ServiceEntryLinesSchema extends BaseSchema {
  protected tableName = 'service_entry_lines'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table
          .bigInteger('service_entry_sheet_id')
          .unsigned()
          .notNullable()
          .references('id')
          .inTable('service_entry_sheets')
          .onDelete('CASCADE')

        table.integer('line_number').nullable()
        table.string('service_code').nullable()
        table.string('description').nullable()
        table.string('planning_line').nullable()
        table.string('currency', 10).nullable()
        table.string('unit', 10).nullable()
        table.decimal('unit_price', 15, 2).nullable()
        table.decimal('quantity', 15, 2).nullable()
        table.decimal('net_value', 15, 2).nullable()

        table.timestamp('created_at')
        table.timestamp('updated_at')

        table.index(['service_entry_sheet_id'], 'service_entry_lines_sheet_id_idx')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
