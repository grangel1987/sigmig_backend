import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddBillNumberField extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const hasDocumentField = await this.schema.hasColumn(this.tableName, 'document')


        this.schema.alterTable(this.tableName, (table) => {
            if (!hasDocumentField) {
                table.string('document').nullable()
            } else {
                table.string('document').nullable().alter()
            }
        })
    }

    public async down() {
        const hasDocumentField = await this.schema.hasColumn(this.tableName, 'document')

        if (!hasDocumentField) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('document')
        })
    }
}