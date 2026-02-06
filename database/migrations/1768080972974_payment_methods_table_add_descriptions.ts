import { BaseSchema } from '@adonisjs/lucid/schema'

export default class PaymentMethodsSchema extends BaseSchema {
  protected tableName = 'payment_methods'

  public async up() {
    const columnExists = await this.schema.hasColumn(this.tableName, 'description')

    if (!columnExists) {
      this.schema.alterTable(this.tableName, (table) => {
        table.string('description').nullable()
      })
    }
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('description')
    })
  }
}
