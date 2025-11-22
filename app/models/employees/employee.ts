
import BusinessEmployee from '#models/business/business_employee'
import City from '#models/cities/City'
import Country from '#models/countries/country'
import Position from '#models/positions/position'
import Setting from '#models/settings/setting'
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

    @column()
    public identifyTypeId: number

    @column()
    public identify: string

    @column()
    public names: string

    @column({ columnName: 'last_name_p' })
    public lastNameP: string

    @column({ columnName: 'position_id' })
    public positionId: number | null

    @belongsTo(() => Position, { foreignKey: 'positionId' })
    public position: BelongsTo<typeof Position>

    @column({ columnName: 'last_name_m' })
    public lastNameM: string

    @column.date({ columnName: 'birth_date' })
    public birthDate: DateTime | null

    @column({ columnName: 'state_civil_id' })
    public stateCivilId: number | null

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

    @column({ columnName: 'city_id' })
    public cityId: number | null

    @column({ columnName: 'nationality_id' })
    public nationalityId: number | null

    @column({ columnName: 'sex_id' })
    public sexId: number | null

    @column()
    public address: string

    @column()
    public phone: string | null

    @column()
    public movil: string

    @column()
    public email: string

    // Media columns
    @column()
    public photo: string | null

    @column()
    public thumb: string | null

    @column({ columnName: 'photo_short' })
    public photoShort: string | null

    @column({ columnName: 'thumb_short' })
    public thumbShort: string | null

    @column({ columnName: 'authorization_mirror' })
    public authorizationMirror: string | null

    @column({ columnName: 'thumb_authorization_mirror' })
    public thumbAuthorizationMirror: string | null

    @column({ columnName: 'authorization_mirror_short' })
    public authorizationMirrorShort: string | null

    @column({ columnName: 'thumb_authorization_mirror_short' })
    public thumbAuthorizationMirrorShort: string | null

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @column({ columnName: 'user_id' })
    public userId: number | null

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @beforeCreate()
    public static async setDefaults(model: Employee) {
        model.token = model.token ?? randomUUID()
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'userId' })
    public user: BelongsTo<typeof User>

    @belongsTo(() => PersonalData, { foreignKey: 'personalDataId' })
    public personalData: BelongsTo<typeof PersonalData>

    @hasMany(() => BusinessEmployee, { foreignKey: 'employeeId' })
    public business: HasMany<typeof BusinessEmployee>

    @belongsTo(() => Setting, { foreignKey: 'identifyTypeId' })
    public typeIdentify: BelongsTo<typeof Setting>

    // Added missing relation for state civil setting (needed for legacy payload)
    @belongsTo(() => Setting, { foreignKey: 'stateCivilId' })
    public stateCivil: BelongsTo<typeof Setting>

    @belongsTo(() => City, { foreignKey: 'cityId' })
    public city: BelongsTo<typeof City>

    @belongsTo(() => Country, { foreignKey: 'nationalityId' })
    public nationality: BelongsTo<typeof Country>

    @belongsTo(() => Setting, { foreignKey: 'sexId' })
    public sexes: BelongsTo<typeof Setting>

    @computed()
    public get fullName(): string {
        return `${this.names} ${this.lastNameP} ${this.lastNameM}`
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
        if (['birth_date', 'admission_date', 'contract_date', 'settlement_date'].includes(field)) {
            return value.toFormat('dd/MM/yyyy')
        }
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
