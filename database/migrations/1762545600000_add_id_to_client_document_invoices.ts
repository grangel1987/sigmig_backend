import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddIdToClientDocumentInvoices extends BaseSchema {
    protected tableName = 'client_document_invoices'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            // Adds an auto-incrementing primary key 'id'. Existing rows will be assigned ids automatically by MySQL.
            table.increments('id').primary()
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('id')
        })
    }
}
