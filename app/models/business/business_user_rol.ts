import Rol from '#models/role/rol'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BusinessUserRol extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public businessUserId: number

  @column()
  public rolId: number

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  @belongsTo(() => Rol)
  public rols: BelongsTo<typeof Rol>
}