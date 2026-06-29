import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class UpdateSalesDocumentTypes extends BaseSchema {
  public async up() {
    const sales = await db.from('sales').whereNotNull('document')
    for (const sale of sales) {
      let doc = sale.document
      if (typeof doc === 'string') {
        try {
          doc = JSON.parse(doc)
        } catch (e) {
          continue
        }
      }
      if (doc && typeof doc === 'object' && !doc.type) {
        doc.type = 'invoice'
        await db.from('sales').where('id', sale.id).update({ document: JSON.stringify(doc) })
      }
    }
  }

  public async down() {
    const sales = await db.from('sales').whereNotNull('document')
    for (const sale of sales) {
      let doc = sale.document
      if (typeof doc === 'string') {
        try {
          doc = JSON.parse(doc)
        } catch (e) {
          continue
        }
      }
      if (doc && typeof doc === 'object' && doc.type === 'invoice') {
        delete doc.type
        await db.from('sales').where('id', sale.id).update({ document: JSON.stringify(doc) })
      }
    }
  }
}