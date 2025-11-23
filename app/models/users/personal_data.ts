import City from '#models/cities/City'
import Setting from '#models/settings/setting'
import User from '#models/users/user'
import { BaseModel, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class PersonalData extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public names: string

  @column({ columnName: 'last_name_p' })
  public lastNameP: string

  @column({ columnName: 'last_name_m' })
  public lastNameM: string

  @column({ columnName: 'type_identify_id' })
  public typeIdentifyId: number | null

  @column()
  public identify: string | null

  @column({ columnName: 'state_civil_id' })
  public stateCivilId: number | null

  @column({ columnName: 'sex_id' })
  public sexId: number | null

  // birth_date is DATE (can be null)
  @column.date({ columnName: 'birth_date' })
  public birthDate: DateTime | null

  @column({ columnName: 'nationality_id' })
  public nationalityId: number | null

  @column({ columnName: 'city_id' })
  public cityId: number | null

  @column()
  public address: string | null

  @column()
  public phone: string | null

  @column()
  public movil: string | null

  @column()
  public email: string

  @column()
  public photo: string | null

  @column()
  public thumb: string | null

  @column({ columnName: 'photo_short' })
  public photoShort: string | null

  @column({ columnName: 'thumb_short' })
  public thumbShort: string | null

  @column({ columnName: 'created_by' })
  public createdBy: number | null

  @column({ columnName: 'updated_by' })
  public updatedBy: number | null

  // timestamps
  @column.dateTime({ autoCreate: true, columnName: 'created_at' })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, columnName: 'updated_at' })
  public updatedAt: DateTime

  /* Relations */
  @belongsTo(() => City, { foreignKey: 'cityId' })
  public city: BelongsTo<typeof City>

  @belongsTo(() => Setting, { foreignKey: 'typeIdentifyId' })
  public typeIdentify: BelongsTo<typeof Setting>

  @belongsTo(() => Setting, { foreignKey: 'stateCivilId' })
  public stateCivil: BelongsTo<typeof Setting>

  @belongsTo(() => Setting, { foreignKey: 'sexId' })
  public sex: BelongsTo<typeof Setting>

  @belongsTo(() => Setting, { foreignKey: 'nationalityId' })
  public nationality: BelongsTo<typeof Setting>

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  public createdByUser: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'updatedBy' })
  public updatedByUser: BelongsTo<typeof User>

  @computed()
  public get fullName(): string {
    return [this.names, this.lastNameP, this.lastNameM].filter(Boolean).join(' ').trim()
  }

  @computed()
  public get age(): number | null {
    if (!this.birthDate) return null
    return Math.trunc(DateTime.now().diff(this.birthDate, 'years').years)
  }

  public static castDates(field: string, value: DateTime) {
    if (field === 'birth_date') return value.toFormat('yyyy-LL-dd')
    return value.toFormat('dd/MM/yyyy hh:mm:ss a')
  }
}
