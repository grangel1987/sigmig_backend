import Product from '#models/products/product'
import Database from '@adonisjs/lucid/services/db'

export default class ProductRepository {
  /** Full index for a business (used by controller) */
  static index(businessId: number) {
    return Product.query()
      .where('business_id', businessId)
      .where('enabled', true)
      .preload('createdBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })
      .preload('updatedBy', (builder) => {
        builder
          .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
          .select(['id', 'personal_data_id', 'email'])
      })

  }

  static async findAutoComplete(val: string | undefined, businessId: number, limit = 20) {
    const sql = `
      SELECT id, name
      FROM products
      WHERE enabled = true
        ${val ? 'AND name LIKE ?' : ''}
        AND business_id = ?
      LIMIT ?
    `


    const bindings: any[] = [businessId, limit]

    if (val) bindings.unshift(`%${val}%`)
    const result = await Database.rawQuery(sql, bindings)
    return result[0]
  }
}