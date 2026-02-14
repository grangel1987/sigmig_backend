import BudgetPayment from '#models/budget_payment'
import BudgetpaymentDetail from '#models/budget_payment_detail'
import Buget from '#models/bugets/buget'
import BugetItem from '#models/bugets/buget_item'
import BugetProduct from '#models/bugets/buget_product'
import Client from '#models/clients/client'
import Coin from '#models/coin/coin'
import LedgerMovement from '#models/ledger_movement'
import PaymentDocumentType from '#models/payment_document_type'
import ServiceEntrySheet from '#models/service_entry_sheets/service_entry_sheet'
import handleDate from '#utils/HandleDate'
import BudgetPaymentValidator from '#validators/budget_payment_validator'
import Database from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface CreateBudgetPaymentParams {
  budgetId?: number
  accountId?: number
  costCenterId?: number
  clientId?: number
  date: DateTime | Date | string
  amount: number
  currencyId: number
  paymentMethodId?: number
  documentTypeId?: number
  documentNumber?: string
  concept?: string
  status?: 'paid' | 'pending' | 'voided'
  isProjected?: boolean
  receivedAt?: DateTime | Date | string | null
  lines?: Array<{
    bugetProductId?: number | null
    bugetItemId?: number | null
    amount?: number | null
  }>
  details?: Array<{
    bugetProductId?: number | null
    bugetItemId?: number | null
    amount?: number | null
  }>
  generateServiceEntrySheet?: boolean
  createdById?: number
  businessId?: number
}

export default class BudgetPaymentService {
  /**
   * Create a budget payment and its corresponding ledger movement
   */
  static async create(params: CreateBudgetPaymentParams) {
    const trx = await Database.transaction()
    console.log('Creating budget payment with params:', params)
    try {
      // Validate the payment amount against remaining budget
      if (params.budgetId) {
        const validation = await BudgetPaymentValidator.validatePaymentAmount(
          params.budgetId,
          params.amount
        )
        BudgetPaymentValidator.throwIfInvalid(validation, params.budgetId, params.amount)
      }

      // Create the budget payment record
      const budgetPayment = await BudgetPayment.create(
        {
          budgetId: params.budgetId,
          amount: params.amount,
          date: DateTime.isDateTime(params.date)
            ? params.date
            : typeof params.date === 'string'
              ? DateTime.fromISO(params.date)
              : DateTime.fromJSDate(params.date),
          voided: false,
          voidedAt: null,
        },
        { client: trx }
      )

      const paymentLines = params.lines ?? params.details

      if (paymentLines?.length) {
        const linesPayload = paymentLines.map((line) => ({
          budgetPaymentId: budgetPayment.id,
          bugetProductId: line.bugetProductId ?? null,
          bugetItemId: line.bugetItemId ?? null,
          amount: line.amount ?? null,
        }))

        await BudgetpaymentDetail.createMany(linesPayload, { client: trx })
      }
      const documentType = params.documentTypeId
        ? await PaymentDocumentType.query({ client: trx })
          .where('id', params.documentTypeId)
          .first()
        : null

      const hasDocumentNumber = Boolean(params.documentNumber?.trim())
      const isProjected = hasDocumentNumber
        ? false
        : (params.isProjected ?? documentType?.isProjected ?? false)

      const status =
        hasDocumentNumber && params.status !== 'voided' ? 'paid' : (params.status ?? 'pending')

      const receivedAt = params.receivedAt
        ? handleDate(params.receivedAt)
        : status === 'paid'
          ? DateTime.now()
          : null

      // Create the ledger movement linked to this budget payment
      const ledgerMovement = await LedgerMovement.create(
        {
          businessId: params.businessId,
          budgetPaymentId: budgetPayment.id,
          accountId: params.accountId,
          costCenterId: params.costCenterId,
          clientId: params.clientId,
          date: handleDate(params.date),
          amount: params.amount,
          currencyId: params.currencyId,
          paymentMethodId: params.paymentMethodId,
          documentTypeId: params.documentTypeId,
          documentNumber: params.documentNumber,
          concept: params.concept,
          status,
          isProjected,
          receivedAt,
        },
        { client: trx }
      )

      const shouldGenerateSheet =
        params.generateServiceEntrySheet && (params.clientId || params.budgetId)

      if (shouldGenerateSheet) {
        const dPaymentLines = params.lines ?? params.details
        const coin = await Coin.query({ client: trx }).where('id', params.currencyId).first()
        let clientId = params.clientId ?? null

        if (!clientId && params.budgetId) {
          const buget = await Buget.query({ client: trx }).where('id', params.budgetId).first()
          clientId = buget?.clientId ?? null
        }

        if (clientId) {
          const client = await Client.query({ client: trx }).where('id', clientId).first()
          const currency = coin?.symbol ?? coin?.name ?? null
          let totalNetAmount = params.amount
          let lineRows: Array<{
            lineNumber: number
            serviceCode: string | null
            description: string | null
            planningLine: string | null
            currency: string | null
            unit: string | null
            unitPrice: number
            quantity: number
            netValue: number
          }> = []

          if (dPaymentLines?.length) {
            const [products, items] = await Promise.all([
              BugetProduct.query({ client: trx }).whereIn(
                'id',
                dPaymentLines
                  .map((line) => line.bugetProductId)
                  .filter((id): id is number => typeof id === 'number')
              ),
              BugetItem.query({ client: trx }).whereIn(
                'id',
                dPaymentLines
                  .map((line) => line.bugetItemId)
                  .filter((id): id is number => typeof id === 'number')
              ),
            ])

            const productMap = new Map(products.map((product) => [product.id, product]))
            const itemMap = new Map(items.map((item) => [item.id, item]))

            lineRows = dPaymentLines.map((line, index) => {
              const product = line.bugetProductId ? productMap.get(line.bugetProductId) : undefined
              const item = line.bugetItemId ? itemMap.get(line.bugetItemId) : undefined
              const description = product?.name ?? item?.title ?? item?.value ?? null
              const amount = line.amount ?? 0

              return {
                lineNumber: index + 1,
                serviceCode: null,
                description,
                planningLine: null,
                currency,
                unit: null,
                unitPrice: amount,
                quantity: 1,
                netValue: amount,
              }
            })
          } else if (params.budgetId) {
            const buget = await Buget.query({ client: trx })
              .where('id', params.budgetId)
              .preload('products')
              .preload('items')
              .first()

            if (buget) {
              totalNetAmount = buget.getTotalAmount()
              const productLines = (buget.products ?? []).map((product) => {
                const quantity = product.countPerson || 1
                const unitPrice = product.amount || 0
                return {
                  serviceCode: null,
                  description: product.name ?? null,
                  planningLine: null,
                  currency,
                  unit: null,
                  unitPrice,
                  quantity,
                  netValue: unitPrice * quantity,
                }
              })

              const itemLines = (buget.items ?? []).map((item) => {
                const unitPrice = Number.parseFloat(String(item.value ?? 0)) || 0
                return {
                  serviceCode: null,
                  description: item.title ?? item.value ?? null,
                  planningLine: null,
                  currency,
                  unit: null,
                  unitPrice,
                  quantity: 1,
                  netValue: unitPrice,
                }
              })

              lineRows = [...productLines, ...itemLines].map((line, index) => ({
                lineNumber: index + 1,
                ...line,
              }))
            }
          }

          if (lineRows.length) {
            const sheetNumber = params.documentNumber?.trim() || `HES-${budgetPayment.id}`
            const sheet = await ServiceEntrySheet.create(
              {
                budgetPaymentId: budgetPayment.id,
                clientId,
                businessId: params.businessId ?? null,
                documentTitle: params.concept ?? null,
                noteToInvoice: null,
                companyName: client?.name ?? null,
                companyAddress: null,
                companyCity: null,
                companyCityCode: null,
                serviceName: params.concept ?? null,
                number: sheetNumber,
                issueDate: handleDate(params.date),
                purchaseOrderNumber: null,
                purchaseOrderPosition: null,
                purchaseOrderDate: null,
                vendorNumber: null,
                currency,
                totalNetAmount,
              },
              { client: trx }
            )

            await sheet.related('lines').createMany(lineRows, { client: trx })
          }
        }
      }

      await trx.commit()

      return {
        budgetPayment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Update a budget payment and its ledger movement
   */
  static async update(budgetPaymentId: number, params: Partial<CreateBudgetPaymentParams>) {
    const trx = await Database.transaction()

    try {
      const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })

      // Validate the new amount if being changed
      if (params.amount !== undefined && params.amount !== budgetPayment.amount) {
        const validation = await BudgetPaymentValidator.validateForUpdate(
          budgetPaymentId,
          params.amount
        )
        BudgetPaymentValidator.throwIfInvalid(validation, budgetPayment.budgetId, params.amount)
      }

      // Update budget payment fields
      if (params.budgetId !== undefined) budgetPayment.budgetId = params.budgetId
      if (params.amount !== undefined) budgetPayment.amount = params.amount
      if (params.date !== undefined) {
        budgetPayment.date = DateTime.isDateTime(params.date)
          ? params.date
          : typeof params.date === 'string'
            ? DateTime.fromISO(params.date)
            : DateTime.fromJSDate(params.date)
      }
      await budgetPayment.save()

      const paymentLines = params.lines ?? params.details

      if (paymentLines) {
        await BudgetpaymentDetail.query({ client: trx })
          .where('budget_payment_id', budgetPaymentId)
          .delete()

        if (paymentLines.length) {
          const linesPayload = paymentLines.map((line) => ({
            budgetPaymentId,
            bugetProductId: line.bugetProductId ?? null,
            bugetItemId: line.bugetItemId ?? null,
            amount: line.amount ?? null,
          }))

          await BudgetpaymentDetail.createMany(linesPayload, { client: trx })
        }
      }

      // Find and update the related ledger movement
      const ledgerMovement = await LedgerMovement.query({ client: trx })
        .where('budget_payment_id', budgetPaymentId)
        .firstOrFail()

      if (params.accountId !== undefined) ledgerMovement.accountId = params.accountId
      if (params.costCenterId !== undefined) ledgerMovement.costCenterId = params.costCenterId
      if (params.clientId !== undefined) ledgerMovement.clientId = params.clientId
      if (params.date !== undefined) {
        ledgerMovement.date = DateTime.isDateTime(params.date)
          ? params.date
          : typeof params.date === 'string'
            ? DateTime.fromISO(params.date)
            : DateTime.fromJSDate(params.date)
      }
      if (params.amount !== undefined) ledgerMovement.amount = params.amount
      if (params.currencyId !== undefined) ledgerMovement.currencyId = params.currencyId
      if (params.paymentMethodId !== undefined)
        ledgerMovement.paymentMethodId = params.paymentMethodId
      let updatedDocumentType: PaymentDocumentType | null = null
      if (params.documentTypeId !== undefined) {
        ledgerMovement.documentTypeId = params.documentTypeId
        updatedDocumentType = await PaymentDocumentType.query({ client: trx })
          .where('id', params.documentTypeId)
          .first()
      }
      if (params.documentNumber !== undefined) ledgerMovement.documentNumber = params.documentNumber
      if (params.concept !== undefined) ledgerMovement.concept = params.concept
      if (params.status !== undefined) ledgerMovement.status = params.status
      if (params.isProjected !== undefined) ledgerMovement.isProjected = params.isProjected
      if (params.receivedAt !== undefined) {
        ledgerMovement.receivedAt =
          params.receivedAt === null
            ? null
            : DateTime.isDateTime(params.receivedAt)
              ? params.receivedAt
              : typeof params.receivedAt === 'string'
                ? DateTime.fromISO(params.receivedAt)
                : DateTime.fromJSDate(params.receivedAt)
      }

      const docNumberNow = params.documentNumber?.trim()
      const markReceived = Boolean(docNumberNow) && params.status !== 'voided'
      if (markReceived) {
        if (!ledgerMovement.receivedAt) ledgerMovement.receivedAt = DateTime.now()
        if (params.status === undefined) ledgerMovement.status = 'paid'
        ledgerMovement.isProjected = false
      } else if (params.documentTypeId !== undefined && params.isProjected === undefined) {
        ledgerMovement.isProjected = updatedDocumentType?.isProjected ?? ledgerMovement.isProjected
      }

      await ledgerMovement.save()

      await trx.commit()

      return {
        budgetPayment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Delete a budget payment and its ledger movement
   */
  static async delete(budgetPaymentId: number) {
    const trx = await Database.transaction()

    try {
      // Delete related ledger movement first
      await LedgerMovement.query({ client: trx })
        .where('budget_payment_id', budgetPaymentId)
        .delete()

      // Delete the budget payment
      const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })
      await budgetPayment.delete()

      await trx.commit()

      return { success: true }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Get budget payment with ledger movement
   */
  static async findWithLedgerMovement(budgetPaymentId: number) {
    const budgetPayment = await BudgetPayment.query()
      .where('id', budgetPaymentId)
      .preload('details', (q) => {
        q.preload('bugetProduct')
      })
      .firstOrFail()

    const ledgerMovement = await LedgerMovement.query()
      .where('budget_payment_id', budgetPaymentId)
      .preload('account')
      .preload('costCenter')
      .preload('client')
      .preload('paymentMethod')
      .first()

    return {
      budgetPayment,
      ledgerMovement,
    }
  }

  /**
   * Void a budget payment
   */
  static async void(budgetPaymentId: number) {
    const trx = await Database.transaction()

    try {
      const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })

      // Mark as voided
      budgetPayment.voided = true
      budgetPayment.voidedAt = DateTime.now()
      await budgetPayment.save()

      // Also update the ledger movement status to voided
      const ledgerMovement = await LedgerMovement.query({ client: trx })
        .where('budget_payment_id', budgetPaymentId)
        .first()

      if (ledgerMovement) {
        ledgerMovement.status = 'voided'
        await ledgerMovement.save()
      }

      await trx.commit()

      return {
        budgetPayment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Convert a projected payment to effective by assigning a document number
   */
  static async settle(budgetPaymentId: number, documentNumber: string, documentTypeId?: number) {
    const trx = await Database.transaction()

    try {
      const budgetPayment = await BudgetPayment.findOrFail(budgetPaymentId, { client: trx })

      // Find and update the related ledger movement
      const ledgerMovement = await LedgerMovement.query({ client: trx })
        .where('budget_payment_id', budgetPaymentId)
        .firstOrFail()

      // Update ledger movement to mark as effective
      ledgerMovement.documentNumber = documentNumber
      if (documentTypeId !== undefined) {
        ledgerMovement.documentTypeId = documentTypeId
      }
      ledgerMovement.isProjected = false
      ledgerMovement.status = 'paid'
      ledgerMovement.receivedAt = DateTime.now()
      await ledgerMovement.useTransaction(trx).save()

      await trx.commit()

      return {
        budgetPayment,
        ledgerMovement,
      }
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Get budget payment status with validation info
   * Returns total, paid, remaining amounts and payment progress
   */
  static async getPaymentStatus(budgetId: number) {
    return await BudgetPaymentValidator.getBudgetPaymentStatus(budgetId)
  }
}
