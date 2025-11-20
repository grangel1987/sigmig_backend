import Setting from '#models/settings/setting'
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
// import TypeIdentify from '#models/type_identify'

export default class PersonalData extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public names: string

  @column()
  public lastNameP: string

  @column()
  public lastNameM: string

  @column()
  public typeIdentifyId: number

  @column()
  public identify: string

  @column()
  public stateCivilId: number

  @column()
  public sexId: number

  // DB column birth_date (DATE)
  @column.dateTime()
  public birthDate: DateTime

  @column()
  public nationalityId: number

  @column()
  public cityId: number

  @column()
  public address: string

  @column()
  public phone: string | null

  @column()
  public movil: string

  @column()
  public email: string

  @column()
  public photo: string | null

  @column()
  public thumb: string | null

  @column()
  public photoShort: string | null

  @column()
  public thumbShort: string | null

  @column()
  public createdBy: number

  @column()
  public updatedBy: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @belongsTo(() => Setting, {
    foreignKey: 'typeIdentifyId',
  })
  public typeIdentify: BelongsTo<typeof Setting>


  @computed()
  public get fullName(): string {
    return `${this.names} ${this.lastNameP} ${this.lastNameM}`
  }
}
