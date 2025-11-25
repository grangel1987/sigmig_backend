import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterEmployeePermitFileToText extends BaseSchema {
    protected tableName = 'employee_permits'

    public async up() {
        await this.schema.alterTable(this.tableName, (table) => {
            table.text('thumb').nullable().alter()
        })
    }

    public async down() {
        await this.schema.alterTable(this.tableName, (table) => {
            table.string('thumb', 255).nullable().alter()
        })
    }
}
