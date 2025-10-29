import Database from '@adonisjs/lucid/services/db'

export default class ProviderRepository {
  /** Autocomplete for Providers */
  static async findAutoComplete(val: string) {
    const sql = `
      SELECT id, name
      FROM providers
      WHERE enabled = true
        AND name ILIKE $1
      LIMIT 20
    `
    const result = await Database.rawQuery(sql, [`%${val}%`])
    return result
  }

  /** Autocomplete for Provider Products */
  static async findProductAutoComplete(providerId: number, val: string) {
    const sql = `
      SELECT 
        id,
        CONCAT(code, ' - ', name) AS identify
      FROM provider_products
      WHERE enabled = true
        AND provider_id = $1
        AND name ILIKE $2
      LIMIT 20
    `
    const result = await Database.rawQuery(sql, [providerId, `%${val}%`])
    return result
  }
}