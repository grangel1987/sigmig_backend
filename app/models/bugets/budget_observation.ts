import Buget from '#models/bugets/buget'
import BusinessUser from '#models/business/business_user'
import { BaseModel, beforeFetch, belongsTo, column, computed } from '@adonisjs/lucid/orm'
import type { ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class BudgetObservation extends BaseModel {
    public static table = 'budget_observations'

    @column({ isPrimary: true })
    public id: number

    @column({ columnName: 'buget_id' })
    public bugetId: number

    @column()
    public message: string

    @column({ columnName: 'from_client' })
    public fromClient: boolean

    @column({ columnName: 'created_by_id' })
    public createdById: number | null

    @belongsTo(() => BusinessUser, { foreignKey: 'createdById' })
    declare createdBy: BelongsTo<typeof BusinessUser>

    @column.dateTime({ columnName: 'created_at', autoCreate: true })
    public createdAt: DateTime

    @column.dateTime({ columnName: 'updated_at', autoCreate: true, autoUpdate: true })
    public updatedAt: DateTime

    @belongsTo(() => Buget, { foreignKey: 'bugetId' })
    public buget: BelongsTo<typeof Buget>

    @computed()
    public from() {
        if (this.createdBy?.user?.personalData) {
            return `${this.createdBy.user.personalData.names} ${this.createdBy.user.personalData.lastNameP} ${this.createdBy.user.personalData.lastNameM}`
        } else return null

    }

    /**
     * Runs before finding multiple records from the database
     */
    @beforeFetch()
    static sort(observations: ModelQueryBuilderContract<typeof BudgetObservation>) {
        observations.orderBy('created_at', 'desc')
    }
}
