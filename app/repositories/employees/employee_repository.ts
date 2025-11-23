import db from '@adonisjs/lucid/services/db'

export interface EmployeeReportRow {
    id: number
    token: string | null
    type_identify: string
    identify: string | null
    names: string
    last_name_p: string
    last_name_m: string
    enabled: boolean
}

export default class EmployeeRepository {
    public static async report(condition: number, expireDate: string | null, costCenterId: number | null, businessId: number) {
        const query = `
        SELECT
            employees.id,
            employees.token,
            settings.text AS type_identify,
            personal_data.identify,
            personal_data.names,
            personal_data.last_name_p,
            personal_data.last_name_m,
            business_employees.enabled
        FROM
            employees
        INNER JOIN personal_data ON employees.personal_data_id = personal_data.id
        INNER JOIN settings ON personal_data.type_identify_id = settings.id
        INNER JOIN business_employees ON employees.id = business_employees.employee_id
        WHERE
            business_employees.business_id=${businessId}
            ${condition === 1 ? ` AND business_employees.enabled=true` : ``}
            ${condition === 2 ? ` AND business_employees.enabled=false` : ``}
            ${expireDate ? `AND business_employees.settlement_date='${expireDate}'` : ``}
            ${costCenterId ? `AND business_employees.cost_center_id = ${costCenterId}` : ``}`;

        const result = await db.rawQuery(query)
        return result[0] as EmployeeReportRow[]
    }

    /** Autocomplete search across names / last names / identify (parameterized) */
    public static async findAutocomplete(businessId: number, value?: string, limit = 20) {
        // Base SQL with optional filter fragments injected safely via bindings
        let sql = `
        SELECT
            employees.id,
            business_employees.business_id,
            business_employees.enabled,
            personal_data.type_identify_id,
            personal_data.identify,
            personal_data.names,
            personal_data.last_name_p,
            personal_data.last_name_m,
            personal_data.photo,
            personal_data.thumb,
            employees.token,
            settings.text
        FROM employees
        INNER JOIN personal_data ON employees.personal_data_id = personal_data.id
        INNER JOIN settings ON personal_data.type_identify_id = settings.id
        INNER JOIN business_employees ON employees.id = business_employees.employee_id
        WHERE business_employees.business_id = ?
        `
        const bindings: any[] = [businessId]
        if (value && value.trim().length) {
            // Add flexible OR conditions for multiple textual columns
            sql += ` AND (
                personal_data.names LIKE ? OR
                personal_data.last_name_p LIKE ? OR
                personal_data.last_name_m LIKE ? OR
                personal_data.identify LIKE ?
            )`
            const like = `%${value.trim()}%`
            bindings.push(like, like, like, like)
        }
        sql += ' ORDER BY personal_data.names ASC LIMIT ?'
        bindings.push(limit)
        const result = await db.rawQuery(sql, bindings)
        return result[0]
    }
}
