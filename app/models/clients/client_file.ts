import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class ClientFile extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'client_id' })
    public clientId: number

    // Full public URL to the file
    @column({ serializeAs: 'url' })
    public url: string | null

    // Shortened URL (if provided by storage helper)
    @column({ columnName: 'url_short', serializeAs: 'url_short' })
    public urlShort: string | null

    // Original file name
    @column({ serializeAs: 'name' })
    public name: string | null

    // Optional business title/label for the file
    @column({ serializeAs: 'title' })
    public title: string | null

    // Audit fields (user IDs)
    @column({ columnName: 'created_by', serializeAs: 'created_by' })
    public createdBy: number | null

    @column({ columnName: 'updated_by', serializeAs: 'updated_by' })
    public updatedBy: number | null

    // Timestamps
    @column.dateTime({ columnName: 'created_at', autoCreate: true, serializeAs: 'created_at' })
    public createdAt: DateTime

    @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true, serializeAs: 'updated_at' })
    public updatedAt: DateTime
}
