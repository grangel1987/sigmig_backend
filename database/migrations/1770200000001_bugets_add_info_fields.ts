import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BugetsAddInfoFields extends BaseSchema {
  protected tableName = 'bugets'

  public async up() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) return

    const hasInfo = await this.schema.hasColumn(this.tableName, 'info')
    if (hasInfo) return

    this.schema.alterTable(this.tableName, (table) => {
      table.json('info').nullable()
    })
  }

  public async down() {
    const hasTable = await this.schema.hasTable(this.tableName)
    if (!hasTable) return

    const hasInfo = await this.schema.hasColumn(this.tableName, 'info')
    if (!hasInfo) return

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('info')
    })
  }
}
