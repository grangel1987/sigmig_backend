import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ClientDocumentInvoice extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'client_id' })
    public clientId: number

    @column({ columnName: 'document_invoice_id' })
    public documentInvoiceId: number

    @column()
    public value?: string | null

    @column({ columnName: 'system_payment_provider' })
    public systemPaymentProvider?: string | null
}
