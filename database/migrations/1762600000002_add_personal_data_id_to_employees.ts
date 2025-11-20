import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AddPersonalDataIdToEmployees extends BaseSchema {
    protected tableName = 'employees'

    public async up() {
        const exists = await this.schema.hasColumn(this.tableName, 'personal_data_id')
        if (exists) return
        await this.schema.alterTable(this.tableName, (table) => {
            table.integer('personal_data_id').nullable().references('id').inTable('personal_data').onDelete('RESTRICT')
        })
    }

    public async down() {
        const exists = await this.schema.hasColumn(this.tableName, 'personal_data_id')
        if (!exists) return
        await this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('personal_data_id')
        })
    }
}
