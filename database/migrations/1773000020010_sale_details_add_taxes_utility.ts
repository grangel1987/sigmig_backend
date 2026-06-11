import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SaleDetailsAddTaxesUtility extends BaseSchema {
    protected tableName = 'sale_details'

    public async up() {
        const db = this.db
        const hasColumn = async (column: string) => {
            const result = await db.rawQuery(
                `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [this.tableName, column]
            )
            return result[0].length > 0
        }

        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasTaxes = await hasColumn('taxes')
        const hasUtility = await hasColumn('utility')

        if (!hasTaxes || !hasUtility) {
            this.schema.alterTable(this.tableName, (table) => {
                if (!hasTaxes) table.json('taxes').nullable().after('amount')
                if (!hasUtility) table.decimal('utility', 15, 2).nullable().after('taxes')
            })
        }

        // Run data updates after schema statements have been executed.
        this.defer(async (deferredDb) => {
            if (!hasTaxes) {
                await deferredDb.rawQuery(
                    `UPDATE sale_details
         SET taxes = JSON_EXTRACT(metadata, '$.taxes')
         WHERE taxes IS NULL
           AND metadata IS NOT NULL
           AND JSON_EXTRACT(metadata, '$.taxes') IS NOT NULL`
                )
            }

            if (!hasUtility) {
                await deferredDb.rawQuery(
                    `UPDATE sale_details
         SET utility = JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.utility'))
         WHERE utility IS NULL
           AND metadata IS NOT NULL
           AND JSON_EXTRACT(metadata, '$.utility') IS NOT NULL`
                )
            }
        })
    }

    public async down() {
        const db = this.db
        const hasColumn = async (column: string) => {
            const result = await db.rawQuery(
                `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [this.tableName, column]
            )
            return result[0].length > 0
        }

        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return

        const hasTaxes = await hasColumn('taxes')
        const hasUtility = await hasColumn('utility')

        if (!hasTaxes && !hasUtility) return

        this.schema.alterTable(this.tableName, (table) => {
            if (hasUtility) table.dropColumn('utility')
            if (hasTaxes) table.dropColumn('taxes')
        })
    }
}
