import db from '@adonisjs/lucid/services/db'

export default class BugetRepository {
    // Find budgets by client name for a business
    public static async findByNameClient(business_id: number, name: string) {
        const query = `
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
            bugets.business_id=${business_id} AND
            clients.name LIKE "%${name}%" AND
            clients.id = bugets.client_id AND 
            settings.id = clients.identify_type_id AND
            clients.city_id = cities.id;`

        const result = await db.rawQuery(query)
        return result.rows ?? result[0]
    }

    // Find budgets by creation date for a business
    public static async findByDate(business_id: number, date: string) {
        const query = `
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
            bugets.business_id=${business_id} AND
            SUBSTRING(bugets.created_at,1,10)='${date}' AND
            clients.id = bugets.client_id AND 
            settings.id = clients.identify_type_id AND
            clients.city_id = cities.id;`
        const result = await db.rawQuery(query)
        return result.rows ?? result[0]
    }

    public static async report(date_initial: string, date_end: string, business_id: number) {
        const query = `
    SELECT 
        bugets.id,
        bugets.nro,
        clients.name,
        settings.text AS identify_type,
        clients.identify,
        bugets.created_at
    FROM
        bugets,
        clients,
        settings
    WHERE
        bugets.client_id= clients.id AND
        bugets.business_id=${business_id} AND
        clients.identify_type_id = settings.id AND
        SUBSTRING(bugets.created_at,1,10) >='${date_initial}' AND
        SUBSTRING(bugets.created_at,1,10) <='${date_end}'`
        const result = await db.rawQuery(query)
        return result.rows ?? result[0]
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
