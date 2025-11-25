import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterEmployeePermitFileToText extends BaseSchema {
    protected tableName = 'employee_permits'

    public async up() {

        const hasSuper = await this.schema.hasColumn(this.tableName, 'is_super')
        const hasAuthorizer = await this.schema.hasColumn(this.tableName, 'is_authorizer')


        if (hasSuper && hasAuthorizer) return
        this.schema.alterTable(this.tableName, (table) => {
            if (!hasAuthorizer) {
                table.boolean('is_authorizer').notNullable().defaultTo(false)
            }
            if (!hasSuper) {
                table.boolean('is_super').notNullable().defaultTo(false)
            }
        })
    }

    public async down() {
    }
}
