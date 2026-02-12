import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddBusinessIdToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table
          .bigInteger('business_id')
          .unsigned()
          .nullable()
          .references('id')
          .inTable('businesses')
          .onDelete('RESTRICT')

        table.index(['business_id'], 'service_entry_sheets_business_id_idx')
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropIndex(['business_id'], 'service_entry_sheets_business_id_idx')
        table.dropColumn('business_id')
      })
    }
  }
}
