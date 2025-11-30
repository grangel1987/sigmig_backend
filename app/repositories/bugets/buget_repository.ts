import Buget from '#models/bugets/buget'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class BugetRepository {
    // Find budgets by client name for a business
    public static async findByNameClient(businessId: number, name: string, page?: number, limit?: number) {
        let query = Buget.query()
            .where('business_id', businessId)
            .whereHas('client', (query) => {
                query.whereRaw('clients.name LIKE ?', [`%${name}%`])
            }).preload('client', q =>
                q.preload('city')
                    .preload('typeIdentify')
            ).orderBy('created_at', 'desc')

        if (page && limit) {
            return await query.paginate(page, limit)
        }

        return await query
    }

    // Find budgets by creation date for a business
    public static async findByDate(businessId: number, date: string, page?: number, limit?: number) {
        const today = DateTime.now().toSQLDate()
        const tomorrow = DateTime.now().plus({ days: 1 }).toSQLDate()

        let query = Buget.query()
            .where('business_id', businessId)
            .preload('client', q =>
                q.preload('city')
                    .preload('typeIdentify')
            )
            .orderBy('created_at', 'desc')

        if (date === today) {
            // If date is today, query for range between today and tomorrow
            query = query.whereRaw('DATE(created_at) BETWEEN ? AND ?', [today, tomorrow])
        } else {
            // Otherwise, query for exact date
            query = query.whereRaw('DATE(created_at) = ?', [date])
        }

        if (page && limit) {
            return await query.paginate(page, limit)
        }

        return await query
    }

    public static async report(businessId: number, dateInitial?: Date, dateEnd?: Date, page?: number, limit?: number) {

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
            .orderBy('created_at', 'desc')

        console.log(bgtQ.toQuery());

        if (page && limit) {
            return await bgtQ.paginate(page, limit)
        }

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

    public static async searchItems(type_id?: number, category_id?: number, params?: string) {
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
                ${category_id ? ` AND setting_buget_items.category_id=${category_id}` : ` `} 
                ${params ? ` AND (setting_buget_items.value LIKE "%${params}%" OR setting_buget_items.title LIKE "%${params}%")` : ``} `
        const result = await db.rawQuery(query)
        return result.rows ?? result[0]
    }
}
