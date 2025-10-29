import Product from '#models/products/product'
import Database from '@adonisjs/lucid/services/db'

export default class ProductRepository {
  /** Full index for a business (used by controller) */
  static index(businessId: number) {
    return Product.query()
      .where('business_id', businessId)
      .preload('createdBy', (b) => b.select('id', 'full_name', 'email'))
      .preload('updatedBy', (b) => b.select('id', 'full_name', 'email'))
  }

  /** Autocomplete – raw query kept for speed */
  static async findAutoComplete(val: string, businessId: number) {
    const sql = `
      SELECT id, name
      FROM products
      WHERE enabled = true
        AND name ILIKE $1
        AND business_id = $2
      LIMIT 20
    `
    const result = await Database.rawQuery(sql, [`%${val}%`, businessId])
    return result
  }
}