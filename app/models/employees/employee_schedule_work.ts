import Business from '#models/business/business'
import SettingSchedule from '#models/schedules/setting_schedule'
import Work from '#models/works/work'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Maps to employee_schedule_works (no primary key defined in schema).
 * Lucid prefers a primary key; since table lacks one we operate in insert-only mode.
 * Avoid update/delete operations that rely on a single row identity.
 */
export default class EmployeeScheduleWork extends BaseModel {
    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column({ columnName: 'business_id' })
    public businessId: number

    @column({ columnName: 'schedule_id' })
    public scheduleId: number

    @column({ columnName: 'work_id' })
    public workId: number

    @column({ columnName: 'art_22' })
    public art22: boolean

    @belongsTo(() => SettingSchedule, { foreignKey: 'scheduleId' })
    public schedule: BelongsTo<typeof SettingSchedule>

    @belongsTo(() => Work, { foreignKey: 'workId' })
    public work: BelongsTo<typeof Work>

    @belongsTo(() => Business, { foreignKey: 'businessId' })
    public business: BelongsTo<typeof Business>
}
