import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddBudgetPaymentIdToServiceEntrySheets extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table
          .integer('budget_payment_id')
          .nullable()
          .references('budget_payments.id')
          .onDelete('RESTRICT')
      })
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('budget_payment_id')
      })
    }
  }
}
