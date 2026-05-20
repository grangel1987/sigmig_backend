import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreateSiiCafFilesTable extends BaseSchema {
    protected tableName = 'sii_caf_files'

    public async up() {
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id')

                table
                    .bigInteger('business_id')
                    .notNullable()
                    .references('id')
                    .inTable('businesses')
                    .onDelete('RESTRICT')

                table.integer('dte_type').notNullable()
                table.bigInteger('range_start').notNullable()
                table.bigInteger('range_end').notNullable()
                table.bigInteger('next_folio').notNullable()
                table.date('issued_at').nullable()
                table.boolean('active').notNullable().defaultTo(true)
                table.string('encrypted_private_key_ref').nullable()
                table.text('raw_caf_xml', 'longtext').nullable()

                table.timestamp('created_at')
                table.timestamp('updated_at')

                table.index(['business_id', 'dte_type'], 'sii_caf_files_business_dte_idx')
                table.index(['business_id', 'dte_type', 'active'], 'sii_caf_files_business_dte_active_idx')
                table.index(['next_folio'], 'sii_caf_files_next_folio_idx')
            })
        }
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
