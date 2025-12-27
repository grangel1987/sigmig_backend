import Shopping from '#models/shoppings/shopping'
import Database from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class ShoppingRepository {
  static async findByNameProvider(businessId: number, name: string) {
    const sql = `
      SELECT 
        shoppings.id,
        shoppings.nro,
        providers.name AS provider_name,
        providers.email,
        cities.name AS city,
        shoppings.created_at,
        shoppings.expire_date,
        shoppings.enabled,
        shoppings.is_authorized
      FROM 
        shoppings,
        providers,
        cities
      WHERE
        shoppings.business_id= ? AND
        providers.name LIKE ? AND
        providers.id = shoppings.provider_id AND
        providers.city_id = cities.id
    `
    const result = await Database.rawQuery(sql, [businessId, `%${name}%`])
    return result[0]
  }

  static async findByDate(businessId: number, date: string) {
    const sql = `
      SELECT 
        shoppings.id,
        shoppings.nro,
        providers.name AS provider_name,
        providers.email,
        cities.name AS city,
        shoppings.created_at,
        shoppings.expire_date,
        shoppings.enabled,
        shoppings.is_authorized
      FROM 
        shoppings,
        providers,
        cities
      WHERE
        shoppings.business_id=? AND
        DATE(shoppings.created_at) = ? AND
        providers.id = shoppings.provider_id AND
        providers.city_id = cities.id
    `
    const result = await Database.rawQuery(sql, [businessId, date])
    return result[0]
  }

  public static async report(businessId: number, dateInitial?: Date, dateEnd?: Date, page?: number, limit?: number) {
    const start = dateInitial ? DateTime.fromJSDate(dateInitial).toSQLDate()! : '1970-01-01'
    const end = dateEnd ? DateTime.fromJSDate(dateEnd).toSQLDate()! : '9999-12-31'

    const q = Shopping.query()
      .where('business_id', businessId)
      .whereRaw('DATE(created_at) BETWEEN ? AND ?', [start, end])
      .preload('provider', (p) => p.select(['id', 'name']))
      .preload('costCenter', (cc) => cc.select(['id', 'code', 'name']))
      .preload('authorizer', (a) => {
        a.select(['id', 'personal_data_id', 'email'])
        a.preload('personalData', (pd) => pd.select(['names', 'last_name_p', 'last_name_m']))
      })
      .select(['id', 'nro', 'provider_id', 'cost_center_id', 'authorizer_id', 'created_at', 'expire_date', 'enabled', 'is_authorized'])
      .orderBy('created_at', 'desc')

    if (page && limit) {
      return await q.paginate(page, limit)
    }

    return await q
  }
}
