import { BaseSchema } from '@adonisjs/lucid/schema'

export default class BusinessSettingBugetItemsPivot extends BaseSchema {
    protected tableName = 'business_setting_buget_items'

    public async up() {
        const exists = await this.schema.hasTable(this.tableName)
        if (exists) return

        this.schema.createTable(this.tableName, (table) => {
            table.integer('business_id').unsigned().notNullable()
            table.integer('setting_buget_item_id').unsigned().notNullable()
            table.primary(['business_id', 'setting_buget_item_id'], 'pk_bus_sbi')
        })
    }

    public async down() {
        this.schema.dropTable(this.tableName)
    }
}
