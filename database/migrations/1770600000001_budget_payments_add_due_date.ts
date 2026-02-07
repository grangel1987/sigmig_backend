import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BudgetPaymentsAddDueDate extends BaseSchema {
    protected tableName = 'budget_payments'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'due_date')
        if (hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.date('due_date').nullable().after('date')
        })
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasColumn = await this.schema.hasColumn(this.tableName, 'due_date')
        if (!hasColumn) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('due_date')
        })
    }
}
