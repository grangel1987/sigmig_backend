import SettingCertificateHealthItem from '#models/certificate_health_item/setting_certificate_health_item'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class EmployeeCertificateHealth extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'employee_id' })
    public employeeId: number

    @column({ columnName: 'health_item_id' })
    public healthItemId: number

    @belongsTo(() => SettingCertificateHealthItem, { foreignKey: 'healthItemId' })
    public item: BelongsTo<typeof SettingCertificateHealthItem>

    /*     @column.dateTime({ autoCreate: true })
        public createdAt: DateTime
    
        @column.dateTime({ autoCreate: true, autoUpdate: true })
        public updatedAt: DateTime */
}
