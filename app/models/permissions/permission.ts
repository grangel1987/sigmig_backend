import Module from '#models/module'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Permission extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public key: string

  @column()
  declare name: string

  @column()
  public description: string

  @column()
  public type: string

  @column()
  public moduleId: number

  @belongsTo(() => Module)
  public module: BelongsTo<typeof Module>

  @column.dateTime({ serializeAs: null })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true, serializeAs: null })
  public updatedAt: DateTime

  public serialize() {
    const serialized = super.serialize()
    for (const field of ['created_at', 'updated_at']) {
      if (serialized[field]) {
        serialized[field] = DateTime.fromISO(serialized[field]).toFormat('dd/MM/yyyy hh:mm:ss a')
      }
    }
    return serialized
  }
}