import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSiiDteDocumentsTable extends BaseSchema {
    protected tableName = 'sii_dte_documents'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')

                table
                    .bigInteger('sale_id')
                    .notNullable()
                    .references('id')
                    .inTable('sales')
                    .onDelete('RESTRICT')

                table
                    .bigInteger('business_id')
                    .notNullable()
                    .references('id')
                    .inTable('businesses')
                    .onDelete('RESTRICT')

                table
                    .bigInteger('caf_file_id')
                    .nullable()
                    .references('id')
                    .inTable('sii_caf_files')
                    .onDelete('RESTRICT')

                table.integer('dte_type').notNullable()
                table.bigInteger('folio').notNullable()

                table
                    .enum('status', [
                        'draft',
                        'signed',
                        'sent',
                        'accepted',
                        'accepted_with_reparo',
                        'rejected',
                        'canceled',
                        'error',
                    ])
                    .notNullable()
                    .defaultTo('draft')

                table.string('sii_track_id').nullable()
                table.string('issuer_rut').nullable()
                table.string('receiver_rut').nullable()
                table.dateTime('issued_at').nullable()

                table.decimal('net_amount', 15, 2).notNullable().defaultTo(0)
                table.decimal('tax_amount', 15, 2).notNullable().defaultTo(0)
                table.decimal('exempt_amount', 15, 2).notNullable().defaultTo(0)
                table.decimal('total_amount', 15, 2).notNullable().defaultTo(0)

                table.text('xml_unsigned', 'longtext').nullable()
                table.text('xml_signed', 'longtext').nullable()
                table.text('ted_xml', 'longtext').nullable()
                table.text('ted_signature').nullable()
                table.text('pdf_url').nullable()
                table.text('xml_url').nullable()
                table.text('last_error', 'longtext').nullable()

                table.timestamp('created_at')
                table.timestamp('updated_at')

                table.unique(['business_id', 'dte_type', 'folio'], {
                    indexName: 'sii_dte_documents_business_dte_folio_unq',
                })
                table.index(['sale_id'], 'sii_dte_documents_sale_id_idx')
                table.index(['caf_file_id'], 'sii_dte_documents_caf_file_id_idx')
                table.index(['status'], 'sii_dte_documents_status_idx')
                table.index(['sii_track_id'], 'sii_dte_documents_track_id_idx')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
