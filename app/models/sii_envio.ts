import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class SiiEnvio extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trackId: string

  @column()
  declare environment: string

  @column()
  declare status: string

  @column()
  declare numInformados: number

  @column()
  declare numAceptados: number

  @column()
  declare numRechazados: number

  @column()
  declare numReparos: number

  @column()
  declare consumedFolios: any

  @column()
  declare reparoDetails: any

  @column()
  declare rawXmlSent: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}