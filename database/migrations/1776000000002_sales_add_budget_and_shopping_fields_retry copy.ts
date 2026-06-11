import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddBudgetAndShoppingFields extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasBudgetId = await this.schema.hasColumn(this.tableName, 'budget_id')
        const hasShoppingId = await this.schema.hasColumn(this.tableName, 'shopping_id')

        if (hasBudgetId && hasShoppingId) return

        this.schema.alterTable(this.tableName, (table) => {
            if (!hasBudgetId) {
                table
                    .integer('budget_id')
                    .nullable()
                    .references('id')
                    .inTable('bugets')
                    .onDelete('SET NULL')
                table.index(['budget_id'], 'sales_budget_id_idx')
            }

            if (!hasShoppingId) {
                table
                    .integer('shopping_id')
                    .nullable()
                    .references('id')
                    .inTable('shoppings')
                    .onDelete('SET NULL')
                table.index(['shopping_id'], 'sales_shopping_id_idx')
            }
        })
    }

    public async down() {
        const hasBudgetId = await this.schema.hasColumn(this.tableName, 'budget_id')
        const hasShoppingId = await this.schema.hasColumn(this.tableName, 'shopping_id')

        if (!hasBudgetId && !hasShoppingId) return

        this.schema.alterTable(this.tableName, (table) => {
            if (hasBudgetId) {
                table.dropIndex(['budget_id'], 'sales_budget_id_idx')
                table.dropColumn('budget_id')
            }

            if (hasShoppingId) {
                table.dropIndex(['shopping_id'], 'sales_shopping_id_idx')
                table.dropColumn('shopping_id')
            }
        })
    }
}