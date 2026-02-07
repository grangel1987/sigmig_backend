import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BugetsAddWorkId extends BaseSchema {
  protected tableName = 'bugets'

  public async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) return

    const hasColumn = await this.schema.hasColumn(this.tableName, 'work_id')
    if (hasColumn) return

    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('work_id')
        .unsigned()
        .nullable()
        .references('works.id')
        .onDelete('RESTRICT')
    })
  }

  public async down() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) return

    const hasColumn = await this.schema.hasColumn(this.tableName, 'work_id')
    if (!hasColumn) return

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('work_id')
    })
  }
}
