import Setting from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo, } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
// import TypeIdentify from '#models/type_identify'

export default class PersonalData extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public names: string

  @column()
  public last_name_p: string

  @column()
  public last_name_m: string

  @column()
  public type_identify_id: number

  @column()
  public identify: string

  @column()
  public created_by: number | null

  @column()
  public updated_by: number | null

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  @belongsTo(() => Setting, {
    foreignKey: 'type_identify_id',
  })
  public typeIdentify: BelongsTo<typeof Setting>
}
