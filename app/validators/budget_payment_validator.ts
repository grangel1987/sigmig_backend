import BudgetPaymentValidationError from '#exceptions/budget_payment_validation_error'
import BudgetPayment from '#models/budget_payment'
import Buget from '#models/bugets/buget'
import Util from '#utils/Util'

interface ValidationResult {
    valid: boolean
    error?: string
    remainingAmount?: number
    totalAmount?: number
    totalPaid?: number
}

export default class BudgetPaymentValidator {
    /**
     * Validate a new budget payment amount against remaining budget
     * @param budgetId The budget ID
     * @param paymentAmount The payment amount to validate
     * @returns ValidationResult with valid flag and optional error message
     */
    static async validatePaymentAmount(
        budgetId: number,
        paymentAmount: number
    ): Promise<ValidationResult> {
        try {
            // Validate basic rules
            if (!budgetId || budgetId <= 0) {
                return { valid: false, error: 'Invalid budget ID' }
            }

            if (paymentAmount <= 0) {
                return { valid: false, error: 'Payment amount must be greater than 0' }
            }

            // Fetch budget with payments and products/items
            const budget = await Buget.query()
                .where('id', budgetId)
                .preload('products')
                .preload('items')
                .preload('payments', (pQ) => {
                    pQ.preload('ledgerMovement')
                })
                .firstOrFail()

            const totalAmount = budget.getTotalAmount()
            const totalPaid = budget.getTotalPaid()
            const remaining = totalAmount - totalPaid

            // Truncate to 2 decimals for comparison
            const paymentRounded = Util.truncateToTwoDecimals(paymentAmount) || 0
            const remainingRounded = Util.truncateToTwoDecimals(remaining) || 0

            // Rule: Payment cannot exceed remaining amount
            if (paymentRounded > remainingRounded) {
                return {
                    valid: false,
                    error: `Payment amount (${paymentRounded}) exceeds remaining budget (${remainingRounded})`,
                    remainingAmount: remainingRounded,
                    totalAmount,
                    totalPaid,
                }
            }

            return {
                valid: true,
                remainingAmount: remainingRounded,
                totalAmount,
                totalPaid,
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('No rows found')) {
                return { valid: false, error: 'Budget not found' }
            }
            throw error
        }
    }

    /**
     * Validate a budget payment update (payment already exists, checking new amount)
     * @param budgetPaymentId The budget payment ID being updated
     * @param newAmount The new payment amount
     * @returns ValidationResult with valid flag and optional error message
     */
    static async validateForUpdate(
        budgetPaymentId: number,
        newAmount: number
    ): Promise<ValidationResult> {
        try {
            // Validate basic rules
            if (!budgetPaymentId || budgetPaymentId <= 0) {
                return { valid: false, error: 'Invalid budget payment ID' }
            }

            if (newAmount <= 0) {
                return { valid: false, error: 'Payment amount must be greater than 0' }
            }

            // Get the existing payment
            const existingPayment = await BudgetPayment.findOrFail(budgetPaymentId)

            // Get budget with all related data
            const budget = await Buget.query()
                .where('id', existingPayment.budgetId)
                .preload('products')
                .preload('items')
                .preload('payments', (pQ) => {
                    pQ.preload('ledgerMovement')
                })
                .firstOrFail()

            const totalAmount = budget.getTotalAmount()

            // Calculate total paid EXCLUDING this payment (since we're updating it)
            const totalPaidExcludingThis = budget.payments
                .filter((p) => p.id !== budgetPaymentId && !p.voided && !p.deletedAt)
                .reduce((sum, p) => sum + (p.amount || 0), 0)

            const remaining = totalAmount - totalPaidExcludingThis

            // Truncate to 2 decimals for comparison
            const newAmountRounded = Util.truncateToTwoDecimals(newAmount) || 0
            const remainingRounded = Util.truncateToTwoDecimals(remaining) || 0

            // Rule: New payment amount cannot exceed (remaining + old payment amount)
            if (newAmountRounded > remainingRounded) {
                return {
                    valid: false,
                    error: `Updated payment amount (${newAmountRounded}) exceeds remaining budget (${remainingRounded})`,
                    remainingAmount: remainingRounded,
                    totalAmount,
                    totalPaid: totalPaidExcludingThis,
                }
            }

            return {
                valid: true,
                remainingAmount: remainingRounded,
                totalAmount,
                totalPaid: totalPaidExcludingThis,
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('No rows found')) {
                return { valid: false, error: 'Budget payment or budget not found' }
            }
            throw error
        }
    }

    /**
     * Throw a validation error if validation fails
     * @throws BudgetPaymentValidationError
     */
    static throwIfInvalid(result: ValidationResult, budgetId?: number, amount?: number) {
        if (!result.valid) {
            throw new BudgetPaymentValidationError(
                result.error || 'Budget payment validation failed',
                budgetId,
                amount,
                result.remainingAmount
            )
        }
    }

    /**
     * Get budget payment status information
     * Useful for API responses to show payment progress
     */
    static async getBudgetPaymentStatus(budgetId: number) {
        try {
            const budget = await Buget.query()
                .where('id', budgetId)
                .preload('products')
                .preload('items')
                .preload('payments', (pQ) => {
                    pQ.preload('ledgerMovement')
                })
                .firstOrFail()

            const totalAmount = budget.getTotalAmount()
            const totalPaid = budget.getTotalPaid()
            const remaining = totalAmount - totalPaid
            const percentagePaid = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0

            return {
                budgetId,
                totalAmount: Util.truncateToTwoDecimals(totalAmount) || 0,
                totalPaid: Util.truncateToTwoDecimals(totalPaid) || 0,
                remaining: Util.truncateToTwoDecimals(remaining) || 0,
                percentagePaid: Util.truncateToTwoDecimals(percentagePaid) || 0,
                isFullyPaid: remaining <= 0.01,
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('No rows found')) {
                throw new Error('Budget not found')
            }
            throw error
        }
    }
}
