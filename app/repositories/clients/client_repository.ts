import Client from '#models/clients/client'
import Database from '@adonisjs/lucid/services/db'

export default class ClientRepository {
    /** Autocomplete for Clients */
    static async findAutoComplete(val: string) {
        const sql = `
      SELECT 
        c.id,
        (s.text || ' ' || c.identify || ' ' || c.name) AS identify
      FROM clients c
      JOIN settings s ON s.id = c.identify_type_id
      WHERE c.enabled = true
        AND (c.identify ILIKE $1 OR c.name ILIKE $1)
      LIMIT 20
    `
        const result = await Database.rawQuery(sql, [`%${val}%`])
        return result
    }

    /** Find by params (email) */
    static async findByParams(email: string) {
        const client = await Client.query()
            .where('email', email)
            .preload('typeIdentify')
            .preload('city')
            .first()
        return client
    }

    /** Search by name */
    static async search(params: string) {
        const sql = `
      SELECT
        c.id,
        c.name,
        c.identify,
        s.text,
        ci.name AS city,
        c.enabled
      FROM clients c
      JOIN settings s ON c.identify_type_id = s.id
      JOIN cities ci ON c.city_id = ci.id
      WHERE c.name ILIKE $1
      LIMIT 50
    `
        const result = await Database.rawQuery(sql, [`%${params}%`])
        return result
    }
}
