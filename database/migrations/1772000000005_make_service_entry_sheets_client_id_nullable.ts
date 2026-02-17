import { BaseSchema } from '@adonisjs/lucid/schema'

export default class MakeServiceEntrySheetsClientIdNullable extends BaseSchema {
  protected tableName = 'service_entry_sheets'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      await this.schema.raw('SET FOREIGN_KEY_CHECKS = 0')
      try {
        this.schema.alterTable(this.tableName, (table) => {
          table.bigInteger('client_id').unsigned().nullable().alter()
        })
      } finally {
        await this.schema.raw('SET FOREIGN_KEY_CHECKS = 1')
      }
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.bigInteger('client_id').unsigned().notNullable().alter()
      })
    }
  }
}
