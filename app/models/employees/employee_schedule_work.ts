import Work from '#models/works/work'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class EmployeeScheduleWork extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column({ columnName: 'work_id' })
    public workId: number

    // TODO: schedule relation requires SettingSchedule model not found in repo
    // @belongsTo(() => SettingSchedule, { foreignKey: 'scheduleId' })
    // public schedule: BelongsTo<typeof SettingSchedule>

    @belongsTo(() => Work, { foreignKey: 'workId' })
    public work: BelongsTo<typeof Work>

    @column.dateTime({ autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime
}
