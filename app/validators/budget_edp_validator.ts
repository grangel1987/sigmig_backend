import BudgetEdp from '#models/budget_edp'
import vine from '@vinejs/vine'

/**
 * Validator for Budget EDP
 */
export const budgetEdpValidator = vine.compile(
  vine.object({
    budgetId: vine.number(),
    edpNumber: vine.number(),
    name: vine.string().nullable().optional(),
    percentage: vine.number().min(0).max(1),
    dueDate: vine.date().nullable().optional(),
  })
)

/**
 * Validates that adding a new EDP or updating an existing one doesn't exceed 100% (1.0)
 */
export default class BudgetEdpValidator {
  static async validatePercentage(
    budgetId: number,
    newPercentage: number,
    excludeEdpId?: number
  ): Promise<{ valid: boolean; currentTotal: number; newTotal: number }> {
    let query = BudgetEdp.query().where('budget_id', budgetId)
    
    if (excludeEdpId) {
      query = query.whereNot('id', excludeEdpId)
    }

    const existingEdps = await query
    
    let currentTotal = existingEdps.reduce((sum, edp) => {
      // Handle the case where percentage might be stored as a string from decimal column
      return sum + Number(edp.percentage)
    }, 0)

    const newTotal = currentTotal + newPercentage

    return {
      valid: newTotal <= 1.0001, // allow small floating point variance
      currentTotal,
      newTotal
    }
  }

  static throwIfInvalidPercentage(
    validation: { valid: boolean; currentTotal: number; newTotal: number },
    budgetId: number
  ) {
    if (!validation.valid) {
      const remaining = Math.max(0, 1 - validation.currentTotal)
      throw new Error(
        `Validation Error: EDP percentage exceeds 100% for Budget ${budgetId}. Remaining allowed: ${(remaining * 100).toFixed(2)}%`
      )
    }
  }
}
