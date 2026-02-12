import { BaseSchema } from '@adonisjs/lucid/schema'

export default class ServiceEntrySheetsSchema extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table
          .bigInteger('client_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('clients')
          .onDelete('RESTRICT')

        table
          .bigInteger('provider_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('providers')
          .onDelete('RESTRICT')

        table
          .bigInteger('business_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('businesses')
          .onDelete('RESTRICT')

        table.string('document_title').nullable()
        table.text('note_to_invoice').nullable()

        table.string('company_name').nullable()
        table.string('company_address').nullable()
        table.string('company_city').nullable()
        table.string('company_city_code').nullable()

        table.string('service_name').nullable()

        table.string('number').notNullable()
        table.date('issue_date').notNullable()

        table.string('purchase_order_number').nullable()
        table.string('purchase_order_position').nullable()
        table.date('purchase_order_date').nullable()

        table.string('vendor_number').nullable()
        table.string('currency', 10).nullable()
        table.decimal('total_net_amount', 15, 2).nullable()

        table.timestamp('created_at')
        table.timestamp('updated_at')

        table.index(['client_id'], 'service_entry_sheets_client_id_idx')
        table.index(['provider_id'], 'service_entry_sheets_provider_id_idx')
        table.index(['business_id'], 'service_entry_sheets_business_id_idx')
        table.index(['number'], 'service_entry_sheets_number_idx')
      })
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
