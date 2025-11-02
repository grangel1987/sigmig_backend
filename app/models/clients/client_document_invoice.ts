import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ClientDocumentInvoice extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'client_id' })
    public clientId: number
}
