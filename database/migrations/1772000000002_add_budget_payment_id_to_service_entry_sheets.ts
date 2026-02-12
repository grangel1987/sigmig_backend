import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddBudgetPaymentIdToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasColumn = await this.schema.hasColumn(this.tableName, 'budget_payment_id')
      if (!hasColumn) {
        this.schema.alterTable(this.tableName, (table) => {
          table
            .integer('budget_payment_id')
            .unsigned()
            .nullable()
        })
      }
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasColumn = await this.schema.hasColumn(this.tableName, 'budget_payment_id')
      if (hasColumn) {
        this.schema.alterTable(this.tableName, (table) => {
          table.dropColumn('budget_payment_id')
        })
      }
    }
  }
}
