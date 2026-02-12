import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddBusinessIdToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasColumn = await this.schema.hasColumn(this.tableName, 'business_id')
      if (!hasColumn) {
        this.schema.alterTable(this.tableName, (table) => {
          table
            .bigInteger('business_id')
            .unsigned()
            .nullable()
        })
      }

      if (!hasColumn) {
        this.schema.alterTable(this.tableName, (table) => {
          table.index(['business_id'], 'service_entry_sheets_business_id_idx')
        })
      }
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasColumn = await this.schema.hasColumn(this.tableName, 'business_id')
      if (hasColumn) {
        this.schema.alterTable(this.tableName, (table) => {
          table.dropIndex(['business_id'], 'service_entry_sheets_business_id_idx')
          table.dropColumn('business_id')
        })
      }
    }
  }
}
