import Client from '#models/clients/client';
import Database from '@adonisjs/lucid/services/db';

export default class ClientRepository {
  /** Autocomplete for Clients */
  static async findAutoComplete(val: string, page?: number, perPage = 20) {
    const valBinding = `%${val}%`

    let query = Client.query()
      .select([
        'clients.id',
        Database.raw("CONCAT(settings.text, ' ', clients.identify, ' ', clients.name) AS identify")
      ])
      .join('settings', 'clients.identify_type_id', 'settings.id')
      .where('clients.enabled', true)
      .where((builder) => {
        builder
          .where('clients.identify', 'LIKE', valBinding)
          .orWhere('clients.name', 'LIKE', valBinding)
      })

    if (page)
      return await query.paginate(page, perPage)
    else
      return await query.limit(perPage)
  }

  /** Find by params (email) */
  static async findByParams(email: string) {
    const client = await Client.query()
      .where('email', email)
      .preload('typeIdentify')
      .preload('city')
      .preload('documentInvoice')
      .preload('responsibles', (builder) => {
        builder.select(['client_id', 'identify_type_id', 'identify', 'name', 'phone', 'email', 'client_contact_type_id'])
        builder.preload('typeIdentify', (b) => b.select(['id', 'text']))
        builder.preload('typeContact', (b) => b.select(['id', 'text']))
      })
      .first()
    return client
  }

  /** Search by name */
  static async search(params: string, page?: number, perPage = 20) {
    const q = Client.query()
      .select([
        'clients.id',
        'clients.name',
        'clients.identify',
        'clients.city_id',
        'settings.text',
        Database.raw('cities.name as city'),
        'clients.enabled',
      ])
      .join('settings', 'clients.identify_type_id', 'settings.id')
      .join('cities', 'clients.city_id', 'cities.id')
      .whereRaw('clients.name LIKE ?', [`%${params}%`])
      .preload('city', (b) => b.select(['id', 'name']));
    const result = page ? await q.paginate(page ?? 1, perPage) : await q;



    return result
  }
}
