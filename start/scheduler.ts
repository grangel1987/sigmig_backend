
import BudgetExpirationService from '#services/budget_expiration_service'
import scheduler from 'adonisjs-scheduler/services/main'

// Run daily to disable expired budgets (keeps logic centralized in service)
scheduler.call(async () => {
    await BudgetExpirationService.disableExpiredBudgets()
}).dailyAt('02:00')