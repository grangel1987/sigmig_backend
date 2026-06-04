import { BaseSchema } from '@adonisjs/lucid/schema'

export default class SalesAddUtility extends BaseSchema {
    protected tableName = 'sales'

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

        const hasUtility = await hasColumn('utility')

        if (!hasUtility) {
            this.schema.alterTable(this.tableName, (table) => {
                table.decimal('utility', 15, 2).nullable().after('total_amount')
            })
        }

        this.defer(async (deferredDb) => {
            if (hasUtility) return

            await deferredDb.rawQuery(
                `UPDATE sales s
                 LEFT JOIN (
                    SELECT sale_id, SUM(COALESCE(utility, 0)) AS detail_utility
                    FROM sale_details
                    GROUP BY sale_id
                 ) d ON d.sale_id = s.id
                 SET s.utility = COALESCE(
                    CASE
                      WHEN JSON_EXTRACT(s.metadata, '$.utility') IS NOT NULL
                        THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(s.metadata, '$.utility')) AS DECIMAL(15, 2))
                      ELSE NULL
                    END,
                    d.detail_utility
                 )
                 WHERE s.utility IS NULL`
            )
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

        const hasUtility = await hasColumn('utility')
        if (!hasUtility) return

        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('utility')
        })
    }
}
