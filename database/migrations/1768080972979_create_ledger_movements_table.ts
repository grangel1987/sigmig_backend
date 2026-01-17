import { BaseSchema } from '@adonisjs/lucid/schema'

export default class LedgerMovementsSchema extends BaseSchema {
  protected tableName = 'ledger_movements'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (!tableExists) {
      this.schema.createTable(this.tableName, (table) => {
        table.increments('id')
        table.bigInteger('business_id').notNullable().references('id').inTable('businesses').onDelete('RESTRICT')

        table.integer('account_id').nullable()
        table.integer('cost_center_id').nullable()
        table.integer('client_id').nullable()
        table.date('date').notNullable()

        // Amount is signed: positive = income, negative = expense
        table.decimal('amount', 15, 2).notNullable()
        table.integer('currency_id').notNullable()

        table.integer('payment_method_id').unsigned().nullable().references('payment_methods.id').onDelete('RESTRICT')
        table.integer('document_type_id').unsigned().nullable().references('document_types.id').onDelete('RESTRICT')
        table.string('document_number').nullable()
        table.text('concept').nullable()

        table.enum('status', ['paid', 'pending', 'canceled']).defaultTo('pending')

        table.integer('budget_payment_id').unsigned().nullable().references('budget_payments.id').onDelete('RESTRICT')
        table.integer('expense_id').unsigned().nullable().references('expenses.id').onDelete('RESTRICT')

        table.timestamp('created_at')
        table.timestamp('updated_at')



        table.index(['date'], 'ledger_movements_date_idx')
      })
    } else {
      // If table exists, no-op for now. Alterations can be handled later.
    }
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
