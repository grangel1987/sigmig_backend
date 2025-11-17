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

    @column()
    public token: string | null

    @column()
    public status: string

    @column()
    public folio: string

    @column.date({ columnName: 'date_status' })
    public dateStatus: DateTime | null

    @column({ columnName: 'motive_id' })
    public motiveId: number

    @column.date({ columnName: 'date_end_relation' })
    public dateEndRelation: DateTime | null

    @column({ columnName: 'work_activity_id' })
    public workActivityId: number

    @column({ columnName: 'occupation_id' })
    public occupationId: number

    @column.date({ columnName: 'date_disposition' })
    public dateDisposition: DateTime | null

    @column({ columnName: 'license_last_six_month' })
    public licenseLastSixMonth: string | null

    @column({ columnName: 'payment_entity_id' })
    public paymentEntityId: number

    @column.date({ columnName: 'business_date' })
    public businessDate: DateTime | null

    @column({ columnName: 'business_comuna' })
    public businessComuna: string

    @column({ columnName: 'compensation_box_id' })
    public compensationBoxId: number

    @column({ columnName: 'mutual_id' })
    public mutualId: number

    @column()
    public other: string | null

    @column({ columnName: 'employee_age' })
    public employeeAge: string

    @column.date({ columnName: 'son_birth_date' })
    public sonBirthDate: DateTime | null

    @column({ columnName: 'son_last_name_p' })
    public sonLastNameP: string | null

    @column({ columnName: 'son_last_name_m' })
    public sonLastNameM: string | null

    @column({ columnName: 'son_names' })
    public sonNames: string | null

    @column({ columnName: 'son_type_identify_id' })
    public sonTypeIdentifyId: number

    @column({ columnName: 'son_identify' })
    public sonIdentify: string | null

    @column({ columnName: 'repose_site' })
    public reposeSite: string

    @column({ columnName: 'repose_address' })
    public reposeAddress: string

    @column({ columnName: 'repose_phone' })
    public reposePhone: string

    @column({ columnName: 'repose_email' })
    public reposeEmail: string

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
        model.enabled = model.enabled ?? false
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
        if (['date_status', 'business_date', 'date_disposition', 'son_birth_date', 'date_end_relation'].includes(field)) {
            return value.toFormat('yyyy-LL-dd')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
