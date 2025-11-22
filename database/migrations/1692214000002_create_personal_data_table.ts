// 1762600000012_create_personal_data_table.ts// 1762600000012_create_personal_data_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class CreatePersonalDataTable extends BaseSchema {
    protected tableName = 'personal_data'

    async up() {
        if (!(await this.schema.hasTable(this.tableName))) {
            this.schema.createTable(this.tableName, (table) => {
                table.increments('id').primary()

                table.integer('type_identify_id').notNullable()
                table.string('identify', 250).notNullable()


                table.string('names', 250).notNullable()
                table.string('last_name_p', 250).notNullable()
                table.string('last_name_m', 250).notNullable()


                table.integer('state_civil_id').notNullable().defaultTo(0)
                table.integer('sex_id').notNullable()
                table.date('birth_date').notNullable()
                table.integer('nationality_id').notNullable()
                table.integer('city_id').notNullable()
                table.text('address').notNullable()


                table.string('phone', 250).nullable()
                table.string('movil', 250).notNullable()
                table.string('email', 250).notNullable()


                table.string('photo', 250).nullable()
                table.string('thumb', 250).nullable()
                table.string('photo_short', 250).nullable()
                table.string('thumb_short', 250).nullable()


                table.integer('created_by').notNullable()
                table.integer('updated_by').notNullable()
                table.datetime('created_at').notNullable()
                table.datetime('updated_at').notNullable()
            })
        }
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}