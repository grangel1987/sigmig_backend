import Setting from '#models/settings/setting'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class EmployeeEmergencyContact extends BaseModel {
    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column({ columnName: 'relationship_id' })
    public relationshipId: number

    @column({ columnName: 'full_name' })
    public fullName: string

    @column({ columnName: 'phone_1' })
    public phone1: string

    @column({ columnName: 'phone_2' })
    public phone2: string | null

    // created_at and updated_at are VARCHAR(50) in the schema
    @column({ columnName: 'created_at' })
    public createdAt: string | null

    @column({ columnName: 'updated_at' })
    public updatedAt: string | null

    @column({ columnName: 'created_by' })
    public createdById: number | null

    @column({ columnName: 'updated_by' })
    public updatedById: number | null

    @belongsTo(() => Setting, { foreignKey: 'relationshipId' })
    public relationship: BelongsTo<typeof Setting>
}
