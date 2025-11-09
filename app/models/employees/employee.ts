
import BusinessEmployee from '#models/business/business_employee'
import City from '#models/cities/City'
import Country from '#models/countries/country'
import Position from '#models/positions/position'
import Setting from '#models/settings/setting'
import User from '#models/users/user'
import { BaseModel, beforeCreate, belongsTo, column, computed, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Employee extends BaseModel {
    @column({ isPrimary: true })
    public id: number

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

    @column({ columnName: 'birth_date' })
    public birthDate: DateTime | null

    @column({ columnName: 'admission_date' })
    public admissionDate: DateTime | null

    @column({ columnName: 'contract_date' })
    public contractDate: DateTime | null

    @column({ columnName: 'settlement_date' })
    public settlementDate: DateTime | null

    @column({ columnName: 'city_id' })
    public cityId: number | null

    @column({ columnName: 'nationality_id' })
    public nationalityId: number | null

    @column({ columnName: 'sex_id' })
    public sexId: number | null

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
    public static async setEnabled(model: Employee) {
        model.enabled = model.enabled ?? true
    }

    @belongsTo(() => User, { foreignKey: 'createdById' })
    public createdBy: BelongsTo<typeof User>

    @belongsTo(() => User, { foreignKey: 'updatedById' })
    public updatedBy: BelongsTo<typeof User>

    @hasMany(() => BusinessEmployee, { foreignKey: 'employeeId' })
    public business: HasMany<typeof BusinessEmployee>

    @belongsTo(() => Setting, { foreignKey: 'identifyTypeId' })
    public typeIdentify: BelongsTo<typeof Setting>

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
