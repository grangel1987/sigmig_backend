import { Exception } from '@adonisjs/core/exceptions'

export default class BudgetPaymentValidationError extends Exception {
    static code = 'E_BUDGET_PAYMENT_VALIDATION'
    static status = 422

    constructor(
        message: string,
        public budgetId?: number,
        public requestedAmount?: number,
        public remainingAmount?: number
    ) {
        super(message, { code: BudgetPaymentValidationError.code, status: 422 })
    }
}
