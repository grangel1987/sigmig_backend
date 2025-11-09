import db from '@adonisjs/lucid/services/db';

export default class EmployeeAccessRepository {
    public static async findAccess(employeeId: number, businessId: number, dateStart: string, dateEnd: string) {
        const query = `
    SELECT
        employee_accesses.schedule_id,
        SUBSTRING(employee_accesses.created_at,1,10) AS date,
        employee_accesses.type,
        employee_accesses.time,
        employee_accesses.time_at,
        employee_accesses.art_22,
        employee_accesses.work_id,
        works.name AS work_name,
        employee_accesses.warning
    FROM
        employee_accesses,
        setting_schedules,
        works
    WHERE 
        employee_accesses.employee_id=${employeeId} AND
        SUBSTRING(employee_accesses.created_at,1,10)>= '${dateStart}' AND
        SUBSTRING(employee_accesses.created_at,1,10)<= '${dateEnd}' AND
        employee_accesses.schedule_id = setting_schedules.id AND
        setting_schedules.business_id=${businessId} AND
        works.id = employee_accesses.work_id`;

        const result = await db.rawQuery(query)
        return result[0]
    }

    public static async findAccessByWorkId(workId: number, dateStart: string, dateEnd: string) {
        const query = `
    SELECT
      employee_accesses.employee_id,
      concat(employees.names,' ',employees.last_name_p,' ', employees.last_name_m)  as employee_name,
      count(employee_accesses.employee_id) as movements
    FROM 
      employee_accesses,
      employees
    WHERE 
      employee_accesses.employee_id=employees.id AND
      employee_accesses.work_id= ${workId} and
      substr(employee_accesses.created_at,1,10) >='${dateStart}' AND
      substr(employee_accesses.created_at,1,10) <='${dateEnd}' 
    GROUP BY
      employee_accesses.employee_id`;

        const result = await db.rawQuery(query)
        return result[0]
    }

    public static async findAccessByEmployeeId(employeeId: number, dateStart: string, dateEnd: string) {
        const query = `
        SELECT          
          employee_accesses.*,
          substr(employee_accesses.created_at,1 ,10) as date
        FROM
          employees,
          employee_accesses
        WHERE
          employees.id = employee_accesses.employee_id AND
          employees.id=${employeeId} AND
          substr(employee_accesses.created_at,1,10) >='${dateStart}' AND
          substr(employee_accesses.created_at,1,10) <='${dateEnd}' 
        ORDER BY
          employee_accesses.created_at ASC`;

        const result = await db.rawQuery(query)
        return result[0]
    }
}
