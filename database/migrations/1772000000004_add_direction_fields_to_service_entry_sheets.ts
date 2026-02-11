import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddDirectionFieldsToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table
          .enu('direction', ['issued', 'received'], {
            useNative: true,
            enumName: 'service_entry_sheets_direction_enum',
          })
          .nullable()

        table.string('issuer_name').nullable()
        table.string('recipient_name').nullable()

        table
          .bigInteger('issuer_client_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('clients')
          .onDelete('RESTRICT')

        table
          .bigInteger('recipient_client_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('clients')
          .onDelete('RESTRICT')

        table.index(['direction'], 'service_entry_sheets_direction_idx')
        table.index(['issuer_client_id'], 'service_entry_sheets_issuer_client_idx')
        table.index(['recipient_client_id'], 'service_entry_sheets_recipient_client_idx')
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropIndex(['direction'], 'service_entry_sheets_direction_idx')
        table.dropIndex(['issuer_client_id'], 'service_entry_sheets_issuer_client_idx')
        table.dropIndex(['recipient_client_id'], 'service_entry_sheets_recipient_client_idx')

        table.dropColumn('recipient_client_id')
        table.dropColumn('issuer_client_id')
        table.dropColumn('recipient_name')
        table.dropColumn('issuer_name')
        table.dropColumn('direction')
      })

      if (this.schema.client && this.schema.client.dialect?.includes('postgres')) {
        await this.schema.raw('DROP TYPE IF EXISTS service_entry_sheets_direction_enum')
      }
    }
  }
}
