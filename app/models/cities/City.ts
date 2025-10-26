
import Country from '#models/countries/country'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class City extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public name: string

  @column()
  public countryId: number

  @column()
  public enabled: boolean

  @column({ columnName: 'created_by' })
  public createdById: number | null

  @column({ columnName: 'updated_by' })
  public updatedById: number | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime  // Changed to snake_case

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime  // Changed to snake_case

  @beforeCreate()
  public static async setEnabled(model: City) {
    model.enabled = true
  }

  @belongsTo(() => Country)
  public country: BelongsTo<typeof Country>

  @belongsTo(() => User, {
    foreignKey: 'createdById',
  })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'updatedById',
  })
  public updatedBy: BelongsTo<typeof User>

  public static castDates(_field: string, value: DateTime): string {
    return value.toFormat('dd/MM/yyyy hh:mm:ss a')
  }
}