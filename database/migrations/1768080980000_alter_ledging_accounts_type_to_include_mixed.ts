import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterLedgingAccountsTypeToIncludeMixed extends BaseSchema {
    protected tableName = 'ledging_accounts'

    public async up() {
        // Altering ENUM in MySQL using raw query
        await this.db.rawQuery(`ALTER TABLE ?? MODIFY COLUMN type ENUM('income', 'expense', 'mixed') NOT NULL`, [this.tableName])
    }

    public async down() {
        // Warning: This down migration can fail if there are rows with 'mixed' type
        await this.db.rawQuery(`ALTER TABLE ?? MODIFY COLUMN type ENUM('income', 'expense') NOT NULL`, [this.tableName])
    }
}
