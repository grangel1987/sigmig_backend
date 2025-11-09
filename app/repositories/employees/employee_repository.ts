import db from '@adonisjs/lucid/services/db'

export interface EmployeeReportRow {
    id: number
    token: string | null
    type_identify: string
    identify: string
    names: string
    last_name_p: string
    last_name_m: string
    enabled: boolean
}

export default class EmployeeRepository {
    public static async findByName(businessId: number, name: string) {
        const query = `
        SELECT
            employees.id,
            business_employees.business_id,
            business_employees.enabled,
            employees.identify_type_id,
            employees.identify,
            employees.names,
            employees.last_name_p,
            employees.last_name_m,
            employees.photo,
            employees.thumb,
            employees.token,
            settings.text,
            employees.birth_date
        FROM
            employees,
            business_employees,
            settings
        WHERE
            employees.id = business_employees.employee_id AND
            business_employees.business_id=${businessId} AND
            settings.id = employees.identify_type_id AND
            employees.names LIKE "%${name}%"`;

        const result = await db.rawQuery(query)
        return result[0]
    }

    public static async findByLastNameP(businessId: number, lastNameP: string) {
        const query = `
        SELECT
            employees.id,
            business_employees.business_id,
            business_employees.enabled,
            employees.identify_type_id,
            employees.identify,
            employees.names,
            employees.last_name_p,
            employees.last_name_m,
            employees.photo,
            employees.thumb,
            employees.token,
            settings.text,
            employees.birth_date
        FROM
            employees,
            business_employees,
            settings
        WHERE
            employees.id = business_employees.employee_id AND
            business_employees.business_id=${businessId} AND
            settings.id = employees.identify_type_id AND
            employees.last_name_p LIKE "%${lastNameP}%"`;

        const result = await db.rawQuery(query)
        return result[0]
    }

    public static async report(condition: number, expireDate: string | null, costCenterId: number | null, businessId: number) {
        const query = `
        SELECT
            employees.id,
            employees.token,
            settings.text AS type_identify,
            employees.identify,
            employees.names,
            employees.last_name_p,
            employees.last_name_m,
            business_employees.enabled
        FROM
            employees,
            settings,
            business_employees
        WHERE
            employees.identify_type_id = settings.id AND
            employees.id = business_employees.employee_id AND
            business_employees.business_id=${businessId}

            ${condition === 1 ? ` AND business_employees.enabled=true` : ``}
            ${condition === 2 ? ` AND business_employees.enabled=false` : ``}
            ${expireDate ? `AND business_employees.settlement_date='${expireDate}'` : ``}
            ${costCenterId ? `AND business_employees.cost_center_id = ${costCenterId}` : ``}`;

        const result = await db.rawQuery(query)
        return result[0] as EmployeeReportRow[]
    }
}
