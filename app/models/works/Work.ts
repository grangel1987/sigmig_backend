import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Work extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public businessId: number

  @column()
  public code: string  // Changed to snake_case

  @column()
  public name: string

  @column()
  public lat: number

  @column()
  public log: number  // Changed to snake_case to match schema

  @column()
  public enabled: boolean

  @column({ columnName: 'created_by_id' })
  public createdById: number  // Changed to snake_case

  @column({ columnName: 'updated_by_id' })
  public updatedById: number  // Changed to snake_case

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime  // Changed to snake_case

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime  // Changed to snake_case

  @beforeCreate()
  public static async setEnabled(model: Work) {
    model.enabled = true
  }

  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  public createdBy: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'updated_by',
  })
  public updatedBy: BelongsTo<typeof User>

  public static castDates(_field: string, value: DateTime): string {
    return value.toFormat('dd/MM/yyyy hh:mm:ss a')
  }
}