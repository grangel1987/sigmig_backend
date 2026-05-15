import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class SaleDetailsAddTaxesUtility extends BaseSchema {
    protected tableName = 'sale_details'

    public async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasTaxes = await this.schema.hasColumn(this.tableName, 'taxes')
        const hasUtility = await this.schema.hasColumn(this.tableName, 'utility')

        if (!hasTaxes || !hasUtility) {
            this.schema.alterTable(this.tableName, (table) => {
                if (!hasTaxes) table.json('taxes').nullable().after('amount')
                if (!hasUtility) table.decimal('utility', 15, 2).nullable().after('taxes')
            })
        }

        // Backfill columns from legacy metadata when present.
        if (!hasTaxes) {
            await db.rawQuery(
                `UPDATE sale_details
         SET taxes = JSON_EXTRACT(metadata, '$.taxes')
         WHERE taxes IS NULL
           AND metadata IS NOT NULL
           AND JSON_EXTRACT(metadata, '$.taxes') IS NOT NULL`
            )
        }

        if (!hasUtility) {
            await db.rawQuery(
                `UPDATE sale_details
         SET utility = JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.utility'))
         WHERE utility IS NULL
           AND metadata IS NOT NULL
           AND JSON_EXTRACT(metadata, '$.utility') IS NOT NULL`
            )
        }
    }

    public async down() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasTaxes = await this.schema.hasColumn(this.tableName, 'taxes')
        const hasUtility = await this.schema.hasColumn(this.tableName, 'utility')

        if (!hasTaxes && !hasUtility) return

        this.schema.alterTable(this.tableName, (table) => {
            if (hasUtility) table.dropColumn('utility')
            if (hasTaxes) table.dropColumn('taxes')
        })
    }
}
