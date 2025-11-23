import City from '#models/cities/City'
import ClientContact from '#models/clients/client_contact'
import ClientDocumentInvoice from '#models/clients/client_document_invoice'
import ClientFile from '#models/clients/client_file'
import Setting from '#models/settings/setting'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ClientRequest from '../client_requests/client_request.js'

export default class Client extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'identify_type_id' })
    public identifyTypeId: number | null

    @column()
    public identify: string | null

    @column()
    public name: string

    @column()
    public phone: string | null

    @column()
    public email: string | null

    @column()
    public giro: string | null

    @column()
    public address: string | null

    @column({ columnName: 'type_id' })
    public typeId: number | null

    @column({ columnName: 'city_id' })
    public cityId: number | null

    @column()
    public enabled: boolean

    @column({})
    public url: string | null

    @column({ columnName: 'url_short', })
    public urlShort: string | null

    @column({ columnName: 'url_thumb', })
    public urlThumb: string | null

    @column({ columnName: 'url_thumb_short', })
    public urlThumbShort: string | null

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static setEnabled(model: Client) {
        model.enabled = true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Setting, { foreignKey: 'identifyTypeId' })
    public typeIdentify: BelongsTo<typeof Setting>

    @belongsTo(() => City)
    public city: BelongsTo<typeof City>

    @hasMany(() => ClientContact, { foreignKey: 'clientId' })
    public responsibles: HasMany<typeof ClientContact>

    @hasMany(() => ClientFile, { foreignKey: 'clientId' })
    public files: HasMany<typeof ClientFile>

    @hasOne(() => ClientDocumentInvoice, { foreignKey: 'clientId' })
    public documentInvoice: HasOne<typeof ClientDocumentInvoice>

    @hasMany(() => ClientRequest, { foreignKey: 'clientId' })
    public request: HasMany<typeof ClientRequest>

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
