import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Alters the four authorizer media/signature mirror fields on employees from
 * VARCHAR(250) to TEXT to allow longer storage.
 * Uses column existence checks and .alter() for safe transitions.
 */
export default class AlterEmployeeAuthorizerFieldsToText extends BaseSchema {
    protected tableName = 'employees'

    private columns = [
        'authorization_mirror',
        'thumb_authorization_mirror',
    ]

    public async up() {
        // Verify which columns exist before attempting alter
        const existing: string[] = []
        for (const col of this.columns) {
            if (await this.schema.hasColumn(this.tableName, col)) existing.push(col)
        }
        if (!existing.length) return

        await this.schema.alterTable(this.tableName, (table) => {
            existing.forEach((col) => {
                // Switch type to TEXT (keep nullable behavior)
                table.text(col).nullable().alter()
            })
        })
    }

    public async down() {
        // Only revert columns that currently exist (and were previously altered)
        const existing: string[] = []
        for (const col of this.columns) {
            if (await this.schema.hasColumn(this.tableName, col)) existing.push(col)
        }
        if (!existing.length) return

        await this.schema.alterTable(this.tableName, (table) => {
            existing.forEach((col) => {
                // Revert to original VARCHAR(250)
                table.string(col, 250).nullable().alter()
            })
        })
    }
}
