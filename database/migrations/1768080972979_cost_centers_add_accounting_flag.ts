import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CostCentersSchema extends BaseSchema {
  protected tableName = 'cost_centers'

  public async up() {
    const hasColumn = await this.schema.hasColumn(this.tableName, 'accounting')

    if (!hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.boolean('accounting').defaultTo(false)
      })
    }
  }

  public async down() {
  }
}
