import Setting from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class EmployeeEmergencyContact extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column()
    public name: string

    @column()
    public phone: string

    @column({ columnName: 'relationship_id' })
    public relationshipId: number

    @belongsTo(() => Setting, { foreignKey: 'relationshipId' })
    public relationship: BelongsTo<typeof Setting>

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    public static castDates(_field: string, value: DateTime) {
        return value.toFormat('dd/MM/yyyy hh:mm:ss a')
    }
}
