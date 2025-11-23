import { BaseSchema } from '@adonisjs/lucid/schema'

export default class AlterPersonalDataPhotoThumbToText extends BaseSchema {
    protected tableName = 'personal_data'

    public async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.text('photo').nullable().alter()
            table.text('thumb').nullable().alter()
        })
    }

    public async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('photo', 250).nullable().alter()
            table.string('thumb', 250).nullable().alter()
        })
    }
}
