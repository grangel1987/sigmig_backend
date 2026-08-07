import type { HttpContext } from '@adonisjs/core/http'
import BudgetEdp from '#models/budget_edp'
import Buget from '#models/bugets/buget'
import BudgetEdpValidator, { budgetEdpValidator } from '#validators/budget_edp_validator'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

import db from '@adonisjs/lucid/services/db'

const updateEdpValidator = vine.compile(
  vine.object({
    percentage: vine.number().min(0).max(1).optional(),
    dueDate: vine.date().nullable().optional(),
    name: vine.string().nullable().optional(),
    details: vine.array(
      vine.object({
        bugetProductId: vine.number(),
        percentage: vine.number().min(0).max(1)
      })
    ).optional()
  })
)

export default class BudgetEdpsController {
  public async index({ params, response }: HttpContext) {
    const budgetId = params.budgetId

    const edps = await BudgetEdp.query()
      .where('budget_id', budgetId)
      .preload('details', (q) => q.preload('bugetProduct'))
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

    // Validate percentage total doesn't exceed 100% per product
    const validation = await BudgetEdpValidator.validatePercentage(budgetId, payload.details)
    BudgetEdpValidator.throwIfInvalidPercentage(validation, budgetId)

    let edpTotalAmount = 0
    const detailsData = payload.details.map(detail => {
      const product = budget.products.find(p => p.id === detail.bugetProductId)
      if (!product) throw new Error(`Product ${detail.bugetProductId} not found in budget`)

      const productTotal = (product.amount || 0) * (product.count || 1) * (product.countPerson || 1)
      const adjustedProductTotal = productTotal - (productTotal * (budget.discount / 100)) + (productTotal * (budget.utility / 100))
      const taxPercentage = product.tax || 0
      const productGross = adjustedProductTotal + (adjustedProductTotal * (taxPercentage / 100))

      const lineAmount = productGross * detail.percentage
      edpTotalAmount += lineAmount

      return {
        bugetProductId: detail.bugetProductId,
        percentage: detail.percentage,
        amount: lineAmount
      }
    })

    const globalGrossAmount = budget.getTotalGrossAmount()
    const effectivePercentage = globalGrossAmount > 0 ? (edpTotalAmount / globalGrossAmount) : 0

    const trx = await db.transaction()
    try {
      const edp = new BudgetEdp()
      edp.budgetId = budgetId
      edp.edpNumber = payload.edpNumber
      edp.name = payload.name ?? null
      edp.percentage = payload.percentage ?? effectivePercentage
      edp.amount = edpTotalAmount
      edp.dueDate = payload.dueDate ? DateTime.fromJSDate(payload.dueDate) : null
      edp.status = 'pending'

      await edp.useTransaction(trx).save()
      await edp.related('details').createMany(detailsData, { client: trx })

      await trx.commit()

      await edp.load('details', (q) => q.preload('bugetProduct'))
      return response.created(edp)
    } catch (err) {
      await trx.rollback()
      throw err
    }
  }

  public async update({ params, request, response }: HttpContext) {
    const edp = await BudgetEdp.query()
      .where('id', params.edpId)
      .andWhere('budget_id', params.budgetId)
      .firstOrFail()

    const payload = await request.validateUsing(updateEdpValidator)

    const trx = await db.transaction()
    try {
      edp.useTransaction(trx)

      if (payload.details && payload.details.length > 0) {
        const validation = await BudgetEdpValidator.validatePercentage(
          params.budgetId,
          payload.details,
          edp.id
        )
        BudgetEdpValidator.throwIfInvalidPercentage(validation, params.budgetId)

        const budget = await Buget.query()
          .where('id', params.budgetId)
          .preload('products')
          .preload('items')
          .firstOrFail()

        let edpTotalAmount = 0
        const detailsData = payload.details.map(detail => {
          const product = budget.products.find(p => p.id === detail.bugetProductId)
          if (!product) throw new Error(`Product ${detail.bugetProductId} not found in budget`)

          const productTotal = (product.amount || 0) * (product.count || 1) * (product.countPerson || 1)
          const adjustedProductTotal = productTotal - (productTotal * (budget.discount / 100)) + (productTotal * (budget.utility / 100))
          const taxPercentage = product.tax || 0
          const productGross = adjustedProductTotal + (adjustedProductTotal * (taxPercentage / 100))

          const lineAmount = productGross * detail.percentage
          edpTotalAmount += lineAmount

          return {
            bugetProductId: detail.bugetProductId,
            percentage: detail.percentage,
            amount: lineAmount
          }
        })

        const globalGrossAmount = budget.getTotalGrossAmount()
        const effectivePercentage = globalGrossAmount > 0 ? (edpTotalAmount / globalGrossAmount) : 0

        edp.amount = edpTotalAmount
        edp.percentage = payload.percentage ?? effectivePercentage

        // Delete old details and insert new
        await edp.related('details').query().useTransaction(trx).delete()
        await edp.related('details').createMany(detailsData, { client: trx })
      } else if (payload.percentage !== undefined) {
        edp.percentage = payload.percentage
      }

      if (payload.dueDate !== undefined) {
        edp.dueDate = payload.dueDate ? DateTime.fromJSDate(payload.dueDate) : null
      }

      if (payload.name !== undefined) {
        edp.name = payload.name ?? null
      }

      await edp.save()
      await trx.commit()
      
      await edp.load('details', (q) => q.preload('bugetProduct'))
      return response.ok(edp)
    } catch (err) {
      await trx.rollback()
      throw err
    }
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

    const edps = await query.preload('details', (q) => q.preload('bugetProduct'))

    return response.ok(edps)
  }
}
