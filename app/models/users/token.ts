import User from '#models/users/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Token extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public userid: number

  @column()
  public token: string

  @column()
  public is_revoked: boolean

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>
}