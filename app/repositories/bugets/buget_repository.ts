import Buget from '#models/bugets/buget'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class BugetRepository {
    // Find budgets by client name for a business
    public static async findByNameClient(businessId: number, name: string) {

        return await Buget.query()
            .where('business_id', businessId)
            .whereHas('client', (query) => {
                query.whereRaw('clients.name LIKE ?', [`%${name}%`])
            }).preload('client', q =>
                q.preload('city')
                    .preload('typeIdentify')
            )



        /*   const query = `
          SELECT 
              bugets.id,
              bugets.nro,
              clients.name AS client_name,
              clients.identify,
              settings.text, 
              clients.email,
              cities.name AS city,
              bugets.created_at,
              bugets.expire_date,
              bugets.enabled
          FROM 
              bugets,
              clients,
              settings,
              cities
          WHERE
              bugets.business_id=${businessId} AND
              clients.name LIKE "%${name}%" AND
              clients.id = bugets.client_id AND 
              settings.id = clients.identify_type_id AND
              clients.city_id = cities.id;`
  
          const result = await db.rawQuery(query)
          return result.rows ?? result[0] */
    }

    // Find budgets by creation date for a business
    public static async findByDate(businessId: number, date: string) {

        return await Buget.query()
            .where('business_id', businessId)
            .where('DATE(date)', date)
            .preload('client', q =>
                q.preload('city')
                    .preload('typeIdentify')
            )
        /*         const query = `
                SELECT 
                    bugets.id,
                    bugets.nro,
                    clients.name AS client_name,
                    CONCAT(settings.text,' ',clients.identify)AS identify,
                    clients.email AS client_email,
                    cities.name AS city,
                    bugets.created_at,
                    bugets.expire_date,
                    bugets.enabled
                FROM 
                    bugets,
                    clients,
                    settings,
                    cities
                WHERE
                    bugets.business_id=${businessId} AND
                    SUBSTRING(bugets.created_at,1,10)='${date}' AND
                    clients.id = bugets.client_id AND 
                    settings.id = clients.identify_type_id AND
                    clients.city_id = cities.id;`
                const result = await db.rawQuery(query)
                return result.rows ?? result[0] */
    }

    public static async report(businessId: number, dateInitial?: Date, dateEnd?: Date,) {

        const start = dateInitial ? DateTime.fromJSDate(dateInitial,).toSQLDate()! : '1970-01-01'
        const end = dateEnd ? DateTime.fromJSDate(dateEnd,).toSQLDate()! : '9999-12-31'

        const bgtQ = Buget.query()
            .where('business_id', businessId)
            .whereRaw('DATE(created_at) BETWEEN ? AND ?', [start, end])
            .preload('client', (clientQuery) => {
                clientQuery.select(['id', 'name', 'identify', 'identify_type_id'])
                    .preload('typeIdentify', (ti) => ti.select(['id', 'text']))
            })
            .select(['id', 'nro', 'client_id', 'created_at'])

        console.log(bgtQ.toQuery());

        const bugets = await bgtQ

        return bugets/* .map((b) => ({
            id: b.id,
            nro: b.nro,
            name: b.client?.name,
            identify_type: b.client?.typeIdentify?.text,
            identify: b.client?.identify,
            // Maintain legacy key naming
            created_at: b.createdAt, // uses model serialization format
        })) */
    }

    public static async searchItems(type_id?: number, category_id?: string, params?: string) {
        const query = `
            SELECT
                setting_buget_items.id,
                setting_buget_items.value,
                setting_buget_items.type_id,
                setting_buget_items.with_title,
                setting_buget_items.title
            FROM
                setting_buget_items
            WHERE
                setting_buget_items.enabled=1 
                ${type_id ? ` AND setting_buget_items.type_id=${type_id}` : ` `} 
                ${category_id ? ` AND setting_buget_items.category_id like "%${category_id}%"` : ` `} 
                ${params ? ` AND (setting_buget_items.value LIKE "%${params}%" OR setting_buget_items.title LIKE "%${params}%")` : ``} `
        const result = await db.rawQuery(query)
        return result.rows ?? result[0]
    }
}
