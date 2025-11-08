import Product from '#models/products/product'
import Database from '@adonisjs/lucid/services/db'

export default class ProductRepository {
  /** Full index for a business (used by controller) */
  static index(businessId: number) {
    return Product.query()
      .where('business_id', businessId)
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

  /** Autocomplete – raw query kept for speed */
  static async findAutoComplete(val: string, businessId: number) {
    const sql = `
      SELECT id, name
      FROM products
      WHERE enabled = true
        AND name LIKE ?
        AND business_id = ?
      LIMIT 20
    `
    const result = await Database.rawQuery(sql, [`%${val}%`, businessId])
    return result
  }
}