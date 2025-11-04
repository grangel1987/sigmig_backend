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
        shoppings.business_id=$1 AND
        providers.name ILIKE $2 AND
        providers.id = shoppings.provider_id AND
        providers.city_id = cities.id
    `
        const result = await Database.rawQuery(sql, [businessId, `%${name}%`])
        return result
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
        shoppings.business_id=$1 AND
        to_char(shoppings.created_at, 'YYYY-MM-DD') = $2 AND
        providers.id = shoppings.provider_id AND
        providers.city_id = cities.id
    `
        const result = await Database.rawQuery(sql, [businessId, date])
        return result
    }
}
