import { BaseSchema } from '@adonisjs/lucid/schema'

export default class LedgingAccountsSchema extends BaseSchema {
    protected tableName = 'ledging_accounts'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')
                table.integer('business_id').unsigned().notNullable().references('id').inTable('business').onDelete('RESTRICT')
                table.string('name').notNullable()
                table.enum('type', ['income', 'expense']).notNullable()

                table.timestamp('created_at')
                table.timestamp('updated_at')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
