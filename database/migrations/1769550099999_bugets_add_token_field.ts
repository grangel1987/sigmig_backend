import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterEmployeePermitFileToText extends BaseSchema {
    protected tableName = 'bugets'

    public async up() {

        const hasTk = await this.schema.hasColumn(this.tableName, 'token')


        if (hasTk) return
        this.schema.alterTable(this.tableName, (table) => {
            table.string('token', 16).nullable()

        })
    }

    public async down() {
    }
}
