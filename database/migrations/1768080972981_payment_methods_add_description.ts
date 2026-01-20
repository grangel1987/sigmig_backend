import { BaseSchema } from '@adonisjs/lucid/schema'

export default class PaymentMethodsSchema extends BaseSchema {
  protected tableName = 'payment_methods'

  public async up() {
    const hasColumn = await this.schema.hasColumn(this.tableName, 'description')

    if (!hasColumn) {
      this.schema.alterTable(this.tableName, (table) => {
        table.boolean('description').defaultTo(false)
      })
    }
  }

  public async down() {
  }
}
