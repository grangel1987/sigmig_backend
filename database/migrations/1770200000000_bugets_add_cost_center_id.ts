import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BugetsAddCostCenterId extends BaseSchema {
  protected tableName = 'bugets'

  public async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) return

    const hasColumn = await this.schema.hasColumn(this.tableName, 'cost_center_id')
    if (hasColumn) return

    this.schema.alterTable(this.tableName, (table) => {
      table.integer('cost_center_id').nullable()
    })
  }

  public async down() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) return

    const hasColumn = await this.schema.hasColumn(this.tableName, 'cost_center_id')
    if (!hasColumn) return

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('cost_center_id')
    })
  }
}
