import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ledging_accounts'

  async up() {
    await this.db.rawQuery(
      `ALTER TABLE ${this.tableName} MODIFY COLUMN type ENUM('income', 'expense', 'mixed') NOT NULL`
    )
  }

  async down() {
    await this.db.rawQuery(
      `ALTER TABLE ${this.tableName} MODIFY COLUMN type ENUM('income', 'expense') NOT NULL`
    )
  }
}