import Buget from '#models/bugets/buget'
import { DateTime } from 'luxon'

export default class BudgetExpirationService {
    /**
     * Disable budgets whose expire_date is <= cutoff (defaults to today).
     * Returns number of budgets updated.
     */
    public static async disableExpiredBudgets(cutoff?: Date | string): Promise<number> {
        const cutoffDate = cutoff
            ? typeof cutoff === 'string'
                ? cutoff
                : DateTime.fromJSDate(cutoff).toSQLDate()!
            : DateTime.now().toSQLDate()!

        const result = await Buget.query()
            .where('enabled', true)
            .whereNotNull('expire_date')
            .where('expire_date', '<=', cutoffDate)
            .update({ enabled: false })

        // Lucid .update() usually returns number of affected rows
        return Number(result ?? 0)
    }
}
