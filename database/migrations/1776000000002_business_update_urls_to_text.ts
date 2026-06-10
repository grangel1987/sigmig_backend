import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddBudgetAndShoppingFields extends BaseSchema {
    protected tableName = 'businesses'

    public async up() {

        this.schema.alterTable(this.tableName, (table) => {
            table.text('url').nullable().alter()
            table.text('url_thumb').nullable().alter()
        })

    }



    public async down() {
    }
}