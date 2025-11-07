import Client from '#models/clients/client';
import Database from '@adonisjs/lucid/services/db';

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
    console.log({ val, sql });
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
  static async search(params: string, limit = 50) {
    const result = await Client.query()
      .select([
        'clients.id',
        'clients.name',
        'clients.identify',
        'settings.text',
        Database.raw('cities.name as city'),
        'clients.enabled',
      ])
      .join('settings', 'clients.identify_type_id', 'settings.id')
      .join('cities', 'clients.city_id', 'cities.id')
      .whereRaw('clients.name LIKE ?', [`%${params}%`])
      .limit(limit)

    return result
  }
}
