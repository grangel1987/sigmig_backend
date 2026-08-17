import type { HttpContext } from '@adonisjs/core/http'
import BudgetEdp from '#models/budget_edp'
import Buget from '#models/bugets/buget'
import BudgetEdpValidator, { budgetEdpValidator } from '#validators/budget_edp_validator'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import db from '@adonisjs/lucid/services/db'
import PermissionService from '#services/permission_service'
import Util from '#utils/Util'
import env from '#start/env'

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
      .preload('authorizer', (b) => {
        b.select(['id', 'personal_data_id', 'email'])
        b.preload('personalData')
      })
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

      const lineAmount = Number((productGross * detail.percentage).toFixed(2))
      edpTotalAmount = Number((edpTotalAmount + lineAmount).toFixed(2))

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

          const lineAmount = Number((productGross * detail.percentage).toFixed(2))
          edpTotalAmount = Number((edpTotalAmount + lineAmount).toFixed(2))

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
      .preload('budget' as any as any, (budgetQuery: any) => {
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

  public async share(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'bugets', 'view')

    const { params, response, request, i18n } = ctx
    const edpId = Number(params.edpId)
    const { email } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().optional(),
        })
      )
    )

    try {
      const edp = await BudgetEdp.query()
        .where('id', edpId)
        .preload('budget' as any as any, (q: any) => {
          q.preload('client')
          q.preload('business')
        })
        .firstOrFail()

      const clientEmail = edp.budget.client?.email
      const recipientEmail = email || clientEmail

      if (!recipientEmail) {
        return response
          .status(400)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.email_required', {}, 'Correo electrónico requerido'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      if (!edp.isAuthorized) {
        return response
          .status(403)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.unauthorized_edp_share', {}, 'El EDP debe ser autorizado antes de ser compartido.'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      const clientName = edp.budget.client?.name || ''
      const budgetNumber = edp.budget.nro
      const businessName = edp.budget.business?.name || ''
      const amount = edp.amount ? `$${Util.truncateToTwoDecimals(edp.amount)}` : '0'
      const dueDate = edp.dueDate
        ? Util.parseToMoment(edp.dueDate, false, { separator: '/', firstYear: false })
        : '---'

      const host =
        env.get('NODE_ENV') === 'development'
          ? 'http://212.38.95.163/sigmig/'
          : 'https://admin.serviciosgenessis.com/'

      const edpUrl = host + `client/edp/${edp.token}`

      const subject = i18n.formatMessage('messages.edp_email_subject', {}, 'Detalle de Estado de Pago')
      const body = i18n.formatMessage('messages.edp_email_body', { clientName, budgetNumber }, `Estimado/a ${clientName}, adjunto encontrará el detalle de estado de pago de la cotización #${budgetNumber}.`)

      const edpNameLabel = i18n.formatMessage('messages.edp_name', {}, 'Hito / Nombre')
      const amountLabel = i18n.formatMessage('messages.amount', {}, 'Monto')
      const dueDateLabel = i18n.formatMessage('messages.due_date', {}, 'Fecha de Pago')
      const budgetNumberLabel = i18n.formatMessage('messages.budget_number')
      const businessLabel = i18n.formatMessage('messages.business')
      const viewEdpLabel = i18n.formatMessage('messages.view_edp', {}, 'Ver Estado de Pago')

      await mail.send((message) => {
        message
          .to(recipientEmail)
          .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
          .subject(subject)
          .htmlView('emails/edp_client', {
            subject,
            body,
            edpName: edp.name || `EDP #${edp.edpNumber}`,
            amount,
            dueDate,
            budgetNumber,
            edpUrl,
            businessName,
            edpNameLabel,
            amountLabel,
            dueDateLabel,
            budgetNumberLabel,
            businessLabel,
            viewEdpLabel,
          })
      })

      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.email_send_ok'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      console.log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.email_send_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async showByToken(ctx: HttpContext) {
    const { params, response, i18n } = ctx
    const token = params.token as string

    try {
      const edp = await BudgetEdp.query()
        .where('token', token)
        .preload('budget' as any as any, (q: any) => {
          q.preload('client', (clientQuery: any) => {
            clientQuery.select(['id', 'name', 'email', 'identify', 'address'])
          })
          q.preload('business', (businessQuery: any) => {
            businessQuery.select([
              'id',
              'name',
              'url',
              'url_short',
              'url_thumb_short',
              'identify',
              'address',
              'phone',
              'email',
            ])
          })
        })
        .preload('details', (q) => q.preload('bugetProduct'))
        .preload('authorizer', (b) => {
          b.select(['id', 'personal_data_id', 'email'])
          b.preload('personalData')
        })
        .first()

      if (!edp) {
        return response
          .status(404)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_exist'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      return response.status(200).json({ edp })
    } catch (error) {
      console.log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.get_error'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async authorize(ctx: HttpContext) {
    const { params, response, auth, i18n } = ctx
    const edpId = Number(params.edpId)
    const budgetId = Number(params.budgetId)

    try {
      const edp = await BudgetEdp.query()
        .where('id', edpId)
        .andWhere('budget_id', budgetId)
        .preload('budget' as any, (q) => q.preload('client').preload('business'))
        .firstOrFail()

      const authUser = auth.user!

      if (!authUser.isAuthorizer && !authUser.isAdmin) {
        return response
          .status(403)
          .json(
            MessageFrontEnd(
              i18n.formatMessage('messages.no_authorizer_permission', {}, 'No tienes permisos para autorizar.'),
              i18n.formatMessage('messages.error_title')
            )
          )
      }

      edp.isAuthorized = true
      edp.authorizerId = authUser.id
      edp.authorizerAt = DateTime.now()

      await edp.save()

      // Notify the EDP creator or client (we'll notify creator/super for now per user request)
      const { default: BusinessUser } = await import('#models/business/business_user')
      const businessUsers = await BusinessUser.query()
        .where('business_id', edp.budget.businessId)
        .andWhere('is_super', 1)
        .preload('user', (userQuery) => {
          userQuery.select(['personal_data_id', 'id', 'email'])
        })

      const clientName = edp.budget.client?.name || ''
      const budgetNumber = edp.budget.nro
      const subject = i18n.formatMessage('messages.edp_authorized_email_subject', { budgetNumber }, `EDP Autorizado - Cotización #${budgetNumber}`)
      const body = i18n.formatMessage('messages.edp_authorized_email_body', { clientName, budgetNumber }, `El Estado de Pago de la cotización #${budgetNumber} ha sido autorizado por ${authUser.full_name}.`)

      for (const businessUser of businessUsers) {
        if (businessUser.user?.email) {
          await mail.send((message) => {
            message
              .to(businessUser.user!.email)
              .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
              .subject(subject)
              .htmlView('emails/edp_client', {
                subject,
                body,
                edpName: edp.name || `EDP #${edp.edpNumber}`,
                amount: edp.amount ? `$${Util.truncateToTwoDecimals(edp.amount)}` : '0',
                dueDate: edp.dueDate ? Util.parseToMoment(edp.dueDate, false, { separator: '/', firstYear: false }) : '---',
                budgetNumber,
                edpUrl: '', // No URL needed for simple notification
                businessName: edp.budget.business?.name || '',
                edpNameLabel: 'Hito / Nombre',
                amountLabel: 'Monto',
                dueDateLabel: 'Fecha',
                budgetNumberLabel: 'Cotización',
                businessLabel: 'Empresa',
                viewEdpLabel: 'Ver',
              })
          })
        }
      }

      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.authorizer_ok', {}, 'Autorizado correctamente.'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      console.log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.authorizer_error', {}, 'Error al autorizar.'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }

  public async authorizeByToken(ctx: HttpContext) {
    const { params, response, request, i18n } = ctx
    const token = params.token as string

    try {
      const edp = await BudgetEdp.query()
        .where('token', token)
        .preload('budget' as any, (q) => q.preload('client').preload('business'))
        .firstOrFail()

      const payload = await request.validateUsing(
        vine.compile(
          vine.object({
            name: vine.string(),
            rut: vine.string()
          })
        )
      )

      edp.isAuthorized = true
      edp.authorizerData = {
        name: payload.name,
        rut: payload.rut,
        authorizedAt: DateTime.now().toISO() || ''
      }

      await edp.save()

      const { default: BusinessUser } = await import('#models/business/business_user')
      const businessUsers = await BusinessUser.query()
        .where('business_id', edp.budget.businessId)
        .andWhere('is_super', 1)
        .preload('user', (userQuery) => {
          userQuery.select(['personal_data_id', 'id', 'email'])
        })

      const clientName = edp.budget.client?.name || ''
      const budgetNumber = edp.budget.nro
      const subject = i18n.formatMessage('messages.edp_authorized_email_subject', { budgetNumber }, `EDP Autorizado - Cotización #${budgetNumber}`)
      const body = i18n.formatMessage('messages.edp_authorized_email_body_client', { clientName, budgetNumber, authorizerName: payload.name }, `El Estado de Pago de la cotización #${budgetNumber} ha sido autorizado por el cliente (${payload.name} - RUT: ${payload.rut}).`)

      for (const businessUser of businessUsers) {
        if (businessUser.user?.email) {
          await mail.send((message) => {
            message
              .to(businessUser.user!.email)
              .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
              .subject(subject)
              .htmlView('emails/edp_client', {
                subject,
                body,
                edpName: edp.name || `EDP #${edp.edpNumber}`,
                amount: edp.amount ? `$${Util.truncateToTwoDecimals(edp.amount)}` : '0',
                dueDate: edp.dueDate ? Util.parseToMoment(edp.dueDate, false, { separator: '/', firstYear: false }) : '---',
                budgetNumber,
                edpUrl: '', 
                businessName: edp.budget.business?.name || '',
                edpNameLabel: 'Hito / Nombre',
                amountLabel: 'Monto',
                dueDateLabel: 'Fecha',
                budgetNumberLabel: 'Cotización',
                businessLabel: 'Empresa',
                viewEdpLabel: 'Ver',
              })
          })
        }
      }

      return response
        .status(200)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.authorizer_ok', {}, 'Autorizado correctamente.'),
            i18n.formatMessage('messages.ok_title')
          )
        )
    } catch (error) {
      console.log(error)
      return response
        .status(500)
        .json(
          MessageFrontEnd(
            i18n.formatMessage('messages.authorizer_error', {}, 'Error al autorizar.'),
            i18n.formatMessage('messages.error_title')
          )
        )
    }
  }
}
