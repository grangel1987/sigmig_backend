import Database from '@adonisjs/lucid/services/db'

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
}
