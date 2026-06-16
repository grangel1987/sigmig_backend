import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddBillNumberField extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasDocumentField = await this.schema.hasColumn(this.tableName, 'document_file')

        if (!hasDocumentField) return

        this.schema.alterTable(this.tableName, (table) => {
            table.json('document').nullable()
        })
    }

    public async down() {
    }
}