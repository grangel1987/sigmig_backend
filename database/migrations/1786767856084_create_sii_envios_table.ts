import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sii_envios'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('track_id').notNullable().unique()
      table.string('environment').defaultTo('certificacion') // certificacion, produccion
      table.string('status').notNullable() // EPR, Aceptado, Rechazado
      table.integer('num_informados').defaultTo(0)
      table.integer('num_aceptados').defaultTo(0)
      table.integer('num_rechazados').defaultTo(0)
      table.integer('num_reparos').defaultTo(0)
      table.json('reparo_details').nullable()
      table.text('raw_xml_sent').nullable()

      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}