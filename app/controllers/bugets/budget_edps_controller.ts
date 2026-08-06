import type { HttpContext } from '@adonisjs/core/http'
import BudgetEdp from '#models/budget_edp'
import Buget from '#models/bugets/buget'
import BudgetEdpValidator, { budgetEdpValidator } from '#validators/budget_edp_validator'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const updateEdpValidator = vine.compile(
  vine.object({
    percentage: vine.number().min(0).max(1).optional(),
    dueDate: vine.date().nullable().optional(),
    name: vine.string().nullable().optional()
  })
)

export default class BudgetEdpsController {
  public async index({ params, response }: HttpContext) {
    const budgetId = params.budgetId

    const edps = await BudgetEdp.query()
      .where('budget_id', budgetId)
      .orderBy('edp_number', 'asc')

    return response.ok(edps)
  }

  public async store({ params, request, response }: HttpContext) {
    const budgetId = params.budgetId
    const payload = await request.validateUsing(budgetEdpValidator)

    const budget = await Buget.query()
      .where('id', budgetId)
      .preload('products')
      .preload('items')
      .firstOrFail()

    // Validate percentage total doesn't exceed 100%
    const validation = await BudgetEdpValidator.validatePercentage(budgetId, payload.percentage)
    BudgetEdpValidator.throwIfInvalidPercentage(validation, budgetId)

    const totalAmount = budget.getTotalAmount()

    const edp = new BudgetEdp()
    edp.budgetId = budgetId
    edp.edpNumber = payload.edpNumber
    edp.name = payload.name ?? null
    edp.percentage = payload.percentage
    edp.amount = totalAmount * payload.percentage
    edp.dueDate = payload.dueDate ? DateTime.fromJSDate(payload.dueDate) : null
    edp.status = 'pending'

    await edp.save()

    return response.created(edp)
  }

  public async update({ params, request, response }: HttpContext) {
    const edp = await BudgetEdp.query()
      .where('id', params.edpId)
      .andWhere('budget_id', params.budgetId)
      .firstOrFail()

    const payload = await request.validateUsing(updateEdpValidator)

    if (payload.percentage !== undefined && payload.percentage !== edp.percentage) {
      const validation = await BudgetEdpValidator.validatePercentage(
        params.budgetId,
        payload.percentage,
        edp.id
      )
      BudgetEdpValidator.throwIfInvalidPercentage(validation, params.budgetId)

      edp.percentage = payload.percentage

      // Recalculate amount
      const budget = await Buget.query()
        .where('id', params.budgetId)
        .preload('products')
        .preload('items')
        .firstOrFail()

      edp.amount = budget.getTotalAmount() * payload.percentage
    }

    if (payload.dueDate !== undefined) {
      edp.dueDate = payload.dueDate ? DateTime.fromJSDate(payload.dueDate) : null
    }

    if (payload.name !== undefined) {
      edp.name = payload.name ?? null
    }

    await edp.save()

    return response.ok(edp)
  }

  public async destroy({ params, response }: HttpContext) {
    const edp = await BudgetEdp.query()
      .where('id', params.edpId)
      .andWhere('budget_id', params.budgetId)
      .preload('payments')
      .firstOrFail()

    if (edp.payments && edp.payments.length > 0) {
      return response.status(400).send({
        error: 'Cannot delete EDP because it has linked payments.'
      })
    }

    await edp.delete()

    return response.noContent()
  }

  public async receivables({ request, response }: HttpContext) {
    const status = request.input('status')
    const toDate = request.input('to_date')

    const query = BudgetEdp.query()
      .preload('budget' as any, (budgetQuery: any) => {
        budgetQuery.preload('client' as any)
      })

    if (status) {
      const statuses = status.split(',')
      query.whereIn('status', statuses)
    }

    if (toDate) {
      query.where('due_date', '<=', toDate)
    }

    query.orderBy('due_date', 'asc')

    const edps = await query

    return response.ok(edps)
  }
}
