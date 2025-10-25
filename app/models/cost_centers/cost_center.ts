import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class CostCenter extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public business_id: number

  @column()
  public code: string  // Changed to snake_case

  @column()
  public name: string

  @column()
  public enabled: boolean

  @column()
  public created_by: number  // Changed to snake_case

  @column()
  public updated_by: number  // Changed to snake_case

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime  // Changed to snake_case

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime  // Changed to snake_case

  @beforeCreate()
  public static async setEnabled(model: CostCenter) {
    model.enabled = true
  }

  @belongsTo(() => User, {
    foreignKey: 'created_by',
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