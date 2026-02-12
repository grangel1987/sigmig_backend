import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddProviderIdToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table
          .bigInteger('provider_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('providers')
          .onDelete('RESTRICT')

        table.index(['provider_id'], 'service_entry_sheets_provider_id_idx')
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropIndex(['provider_id'], 'service_entry_sheets_provider_id_idx')
        table.dropColumn('provider_id')
      })
    }
  }
}
