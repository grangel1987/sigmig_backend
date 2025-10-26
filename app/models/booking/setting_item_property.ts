import Setting from '#models/settings/setting'; // Adjust path based on your project structure
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class SettingItemProperty extends BaseModel {
    @column({ isPrimary: true })
    public id: number

    @column()
    public label: string

    @column()
    public group: string

    @column()
    public position: number

    @column()
    public enabled: boolean

    @column()
    public typeId: number

    @belongsTo(() => Setting, { foreignKey: 'typeId' })
    public type: BelongsTo<typeof Setting>
}