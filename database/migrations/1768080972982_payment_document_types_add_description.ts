import { BaseSchema } from '@adonisjs/lucid/schema'

export default class PaymentMethodsSchema extends BaseSchema {
  protected tableName = 'document_types'

  public async up() {
    const hasColumn = await this.schema.hasColumn(this.tableName, 'description')

    if (!hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.string('description')
      })
    }
  }

  public async down() {
    if (await this.schema.hasColumn(this.tableName, 'description'))
      this.schema.alterTable(this.tableName, (table) => {
        table.dropColumn('description')
      })
  }
}
