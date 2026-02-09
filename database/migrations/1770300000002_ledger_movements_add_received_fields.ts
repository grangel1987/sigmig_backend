import { BaseSchema } from '@adonisjs/lucid/schema'

export default class LedgerMovementsAddReceivedFields extends BaseSchema {
  protected tableName = 'ledger_movements'

  public async up() {
    const tableExists = await this.schema.hasTable(this.tableName)

    if (tableExists) {
      const hasIsProjected = await this.schema.hasColumn(this.tableName, 'is_projected')
      const hasReceivedAt = await this.schema.hasColumn(this.tableName, 'received_at')

      if (!hasIsProjected) {
        this.schema.alterTable(this.tableName, (table) => {
          table.boolean('is_projected').notNullable().defaultTo(false)
        })
      }

      if (!hasReceivedAt) {
        this.schema.alterTable(this.tableName, (table) => {
          table.timestamp('received_at').nullable()
        })
      }
    }
  }

  public async down() {
    const tableExists = await this.schema.hasTable(this.tableName)
    if (tableExists) {
      const hasIsProjected = await this.schema.hasColumn(this.tableName, 'is_projected')
      const hasReceivedAt = await this.schema.hasColumn(this.tableName, 'received_at')

      if (hasIsProjected || hasReceivedAt) {
        this.schema.alterTable(this.tableName, (table) => {
          if (hasIsProjected) table.dropColumn('is_projected')
          if (hasReceivedAt) table.dropColumn('received_at')
        })
      }
    }
  }
}
