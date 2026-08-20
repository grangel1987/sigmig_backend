import BudgetEdp from '#models/budget_edp'
import vine from '@vinejs/vine'

/**
 * Validator for Budget EDP
 */
export const budgetEdpValidator = vine.compile(
  vine.object({
    budgetId: vine.number(),
    edpNumber: vine.number().optional(),
    name: vine.string(),
    percentage: vine.number().min(0).max(1).optional(),
    dueDate: vine.date().nullable().optional(),
    details: vine.array(
      vine.object({
        bugetProductId: vine.number(),
        percentage: vine.number().min(0).max(1)
      })
    ).minLength(1)
  })
)

/**
 * Validates that adding a new EDP or updating an existing one doesn't exceed 100% (1.0) per product
 */
export default class BudgetEdpValidator {
  static async validatePercentage(
    budgetId: number,
    details: { bugetProductId: number, percentage: number }[],
    excludeEdpId?: number
  ): Promise<{ valid: boolean; invalidProductIds: number[] }> {
    let query = BudgetEdp.query().where('budget_id', budgetId)
    
    if (excludeEdpId) {
      query = query.whereNot('id', excludeEdpId)
    }

    const existingEdps = await query.preload('details')
    
    // Calculate current totals per product
    const currentTotals = new Map<number, number>()
    
    for (const edp of existingEdps) {
      for (const detail of edp.details) {
        const current = currentTotals.get(detail.bugetProductId) || 0
        currentTotals.set(detail.bugetProductId, current + Number(detail.percentage))
      }
    }

    const invalidProductIds: number[] = []

    for (const detail of details) {
      const current = currentTotals.get(detail.bugetProductId) || 0
      const newTotal = current + detail.percentage
      
      if (newTotal > 1.0001) {
        invalidProductIds.push(detail.bugetProductId)
      }
    }

    return {
      valid: invalidProductIds.length === 0,
      invalidProductIds
    }
  }

  static throwIfInvalidPercentage(
    validation: { valid: boolean; invalidProductIds: number[] },
    budgetId: number
  ) {
    if (!validation.valid) {
      throw new Error(
        `Validation Error: EDP percentage exceeds 100% for Budget ${budgetId} on products: ${validation.invalidProductIds.join(', ')}`
      )
    }
  }
}
