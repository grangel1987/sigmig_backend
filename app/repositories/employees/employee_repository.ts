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
    public static async report(condition: number, expireDate: string | null, costCenterId: number | null, businessId: number, page?: number, perPage?: number) {
        const qb = db.from('employees')
            .select(
                'employees.id',
                'employees.token',
                'settings.text as type_identify',
                'personal_data.identify',
                'personal_data.names',
                'personal_data.last_name_p',
                'personal_data.last_name_m',
                'business_employees.enabled'
            )
            .innerJoin('personal_data', 'employees.personal_data_id', 'personal_data.id')
            .innerJoin('settings', 'personal_data.type_identify_id', 'settings.id')
            .innerJoin('business_employees', 'employees.id', 'business_employees.employee_id')
            .where('business_employees.business_id', businessId)

        if (condition === 1) qb.where('business_employees.enabled', true)
        if (condition === 2) qb.where('business_employees.enabled', false)
        if (expireDate) qb.where('business_employees.settlement_date', expireDate)
        if (costCenterId) qb.where('business_employees.cost_center_id', costCenterId)


        if (page) {
            const rows = await qb.paginate(page, perPage)
            return {
                ...rows.getMeta(),
                data: rows.all().map((r) => ({
                    token: r.token,
                    nombre: r.names,
                    identificacion: `${r.type_identify} ${r.identify}`,
                    apellidos: `${r.last_name_p} ${r.last_name_m}`,
                    estado: r.enabled ? 'Activo' : 'Inactivo',
                })),
            }

        } else {
            const rows = await qb
            return rows as EmployeeReportRow[]
        }
    }

    /** Autocomplete search across names / last names / identify (parameterized) with pagination */
    public static async findAutocomplete(businessId: number, value?: string, page = 1, perPage = 20) {
        const qb = db.from('employees')
            .select(
                'employees.id',
                'business_employees.business_id',
                'business_employees.enabled',
                'personal_data.type_identify_id',
                'personal_data.identify',
                'personal_data.names',
                'personal_data.last_name_p',
                'personal_data.last_name_m',
                'personal_data.photo',
                'personal_data.thumb',
                'employees.token',
                'settings.text'
            )
            .innerJoin('personal_data', 'employees.personal_data_id', 'personal_data.id')
            .innerJoin('settings', 'personal_data.type_identify_id', 'settings.id')
            .innerJoin('business_employees', 'employees.id', 'business_employees.employee_id')
            .where('business_employees.business_id', businessId)

        if (value && value.trim().length) {
            const like = `%${value.trim()}%`
            qb.where((builder: any) => {
                builder.where('personal_data.names', 'like', like)
                    .orWhere('personal_data.last_name_p', 'like', like)
                    .orWhere('personal_data.last_name_m', 'like', like)
                    .orWhere('personal_data.identify', 'like', like)
            })
        }

        qb.orderBy('personal_data.names', 'asc')

        const rows = await (page ? qb.paginate(page, perPage) : qb)
        return rows
    }
}
