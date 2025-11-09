import Business from '#models/business/business'
import Employee from '#models/employees/employee'
import SettingLicTypeLicense from '#models/setting_lic/setting_lic_type_license'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'

export default class EmployeeLicenseHealth extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column({ columnName: 'business_id' })
    public businessId: number

    @column({ columnName: 'type_license_id' })
    public typeLicenseId: number

    @column({ columnName: 'authorizer_id' })
    public authorizerId: number | null

    @column({ columnName: 'date_status' })
    public dateStatus: DateTime | null

    @column({ columnName: 'business_date' })
    public businessDate: DateTime | null

    @column({ columnName: 'date_disposition' })
    public dateDisposition: DateTime | null

    @column({ columnName: 'son_birth_date' })
    public sonBirthDate: DateTime | null

    @column()
    public token: string | null

    @column()
    public enabled: boolean

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static async setDefaults(model: EmployeeLicenseHealth) {
        model.enabled = model.enabled ?? true
        model.token = model.token ?? randomUUID()
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => Employee, { foreignKey: 'employeeId' })
    public employee: BelongsTo<typeof Employee>

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>

    @belongsTo(() => SettingLicTypeLicense, { foreignKey: 'typeLicenseId' })
    public typeLicense: BelongsTo<typeof SettingLicTypeLicense>

    public static castDates(field: string, value: DateTime) {
        if (['date_status', 'business_date', 'date_disposition', 'son_birth_date'].includes(field)) {
            return value.toFormat('yyyy-LL-dd')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
