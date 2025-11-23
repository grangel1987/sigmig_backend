import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterEmployeePermitFileToText extends BaseSchema {
    protected tableName = 'employee_permits'

    public async up() {
        await this.schema.alterTable(this.tableName, (table) => {
            table.text('file').nullable().alter()
        })
    } bnb

    public async down() {
        await this.schema.alterTable(this.tableName, (table) => {
            table.string('file', 255).nullable().alter()
        })
    }
}
