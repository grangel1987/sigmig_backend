import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddClientIdToSalesTable extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            return
        }

        const hasClientId = await this.schema.hasColumn(this.tableName, 'client_id')

        if (!hasClientId) {
            this.schema.alterTable(this.tableName, (table) => {
                table
                    .integer('client_id')
                    .unsigned()
                    .nullable()
                    .references('id')
                    .inTable('clients')
                    .onDelete('RESTRICT')

                table.index(['client_id'], 'sales_client_id_idx')
            })
        }
    }

    public async down() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            return
        }

        const hasClientId = await this.schema.hasColumn(this.tableName, 'client_id')

        if (hasClientId) {
            this.schema.alterTable(this.tableName, (table) => {
                table.dropIndex(['client_id'], 'sales_client_id_idx')
                table.dropColumn('client_id')
            })
        }
    }
}