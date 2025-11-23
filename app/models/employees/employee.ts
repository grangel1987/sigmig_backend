
import BusinessEmployee from '#models/business/business_employee'
import Position from '#models/positions/position'
import PersonalData from '#models/users/personal_data'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'crypto'
import { DateTime } from 'luxon'
import EmployeeCertificateHealth from './employee_certificate_health.js'
import EmployeeEmergencyContact from './employee_emergency_contact.js'
import EmployeeScheduleWork from './employee_schedule_work.js'

export default class Employee extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public token: string | null

    // Legacy identity/name/location/contact fields now in personalData.

    @column({ columnName: 'position_id' })
    public positionId: number | null

    @belongsTo(() => Position, { foreignKey: 'positionId' })
    public position: BelongsTo<typeof Position>

    // Removed lastNameM, birthDate, stateCivilId (now in personalData)

    @column({ columnName: 'personal_data_id' })
    public personalDataId: number | null

    @hasMany(() => EmployeeCertificateHealth)
    public certificateHealth: HasMany<typeof EmployeeCertificateHealth>

    @hasMany(() => EmployeeScheduleWork)
    public scheduleWork: HasMany<typeof EmployeeScheduleWork>

    @hasMany(() => EmployeeEmergencyContact)
    public emergencyContacts: HasMany<typeof EmployeeEmergencyContact>

    @column.date({ columnName: 'admission_date' })
    public admissionDate: DateTime | null

    @column.date({ columnName: 'contract_date' })
    public contractDate: DateTime | null

    @column.date({ columnName: 'settlement_date' })
    public settlementDate: DateTime | null

    // Removed: cityId, nationalityId, sexId, address, phone, movil, email, photo/thumb variants.

    @column({ columnName: 'authorization_mirror' })
    public authorizationMirror: string | null

    @column({ columnName: 'thumb_authorization_mirror' })
    public thumbAuthorizationMirror: string | null

    @column({ columnName: 'authorization_mirror_short' })
    public authorizationMirrorShort: string | null

    @column({ columnName: 'thumb_authorization_mirror_short' })
    public thumbAuthorizationMirrorShort: string | null

    // Removed: createdById / updatedById (handled via personalData if needed)

    @column({ columnName: 'user_id' })
    public userId: number | null

    // Restore auditing user references (were erroneously removed)
    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static async setDefaults(model: Employee) {
        model.token = model.token ?? randomUUID()
    }

    @belongsTo(() => User, { foreignKey: 'userId' })
    public user: BelongsTo<typeof User>

    @belongsTo(() => PersonalData, { foreignKey: 'personalDataId' })
    public personalData: BelongsTo<typeof PersonalData>

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @hasMany(() => BusinessEmployee, { foreignKey: 'employeeId' })
    public business: HasMany<typeof BusinessEmployee>

    @computed()
    public get fullName(): string {
        if (this.personalData) {
            const pd = this.personalData
            return [pd.names, pd.lastNameP, pd.lastNameM].filter(Boolean).join(' ').trim()
        }
        return ''
    }

    // scheduleWork -> TODO: requires SettingSchedule model not present in repo
    // @hasMany(() => EmployeeScheduleWork, { foreignKey: 'employeeId' })
    // public scheduleWork: HasMany<typeof EmployeeScheduleWork>

    // certificateHealth
    // @hasMany(() => EmployeeCertificateHealth, { foreignKey: 'employeeId' })
    // public certificateHeatlh: HasMany<typeof EmployeeCertificateHealth>

    // emergencyContacts
    // @hasMany(() => EmployeeEmergencyContact, { foreignKey: 'employeeId' })
    // public emergencyContacts: HasMany<typeof EmployeeEmergencyContact>

    public static castDates(field: string, value: DateTime) {
        if (['admission_date', 'contract_date', 'settlement_date'].includes(field)) {
            return value.toFormat('dd/MM/yyyy')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
