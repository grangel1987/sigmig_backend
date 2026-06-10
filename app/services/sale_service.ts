import Buget from '#models/bugets/buget'
import Sale, { type SaleStatus } from '#models/sales/sale'
import Shopping from '#models/shoppings/shopping'
import SiiCafFile from '#models/sii/sii_caf_file'
import SiiDteDocument from '#models/sii/sii_dte_document'
import SiiDteEvent from '#models/sii/sii_dte_event'
import { mergeSaleMetadata, normalizeSaleMetadata } from '#services/sales/sale_payload_service'
import CafService from '#services/sii/caf_service'
import SiiXmlBuilderService from '#services/sii/sii_xml_builder_service'
import XmlSignatureService from '#services/sii/xml_signature_service'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface CreateSalePayload {
  businessId: number
  createdById: number
  clientId: number
  budgetId?: number | null
  shoppingId?: number | null
  billNumber?: string | null
  title?: string | null
  description?: string | null
  saleDate?: string | null
  status?: SaleStatus
  totalAmount?: number | null
  utility?: number | null
  currencyId?: number | null
  metadata?: Record<string, unknown> | null
  banks?: unknown[] | null
  details: Array<{
    productId?: number | null
    lineNumber?: number | null
    description?: string | null
    quantity: number
    unitAmount: number
    amount?: number
    taxes?: unknown[] | null
    utility?: number | null
    metadata?: Record<string, unknown> | null
  }>
}

interface UpdateSalePayload {
  clientId?: number
  budgetId?: number | null
  shoppingId?: number | null
  billNumber?: string | null
  title?: string | null
  description?: string | null
  saleDate?: string | null
  status?: SaleStatus
  totalAmount?: number | null
  utility?: number | null
  currencyId?: number | null
  metadata?: Record<string, unknown> | null
  banks?: unknown[] | null
  details?: Array<{
    productId?: number | null
    lineNumber?: number | null
    description?: string | null
    quantity: number
    unitAmount: number
    amount?: number
    taxes?: unknown[] | null
    utility?: number | null
    metadata?: Record<string, unknown> | null
  }>
}

function normalizeTaxes(detailAmount: number, taxes?: unknown[] | null) {
  if (!Array.isArray(taxes)) return []

  return taxes.reduce<Record<string, unknown>[]>((acc, taxItem) => {
    if (typeof taxItem === 'number') {
      acc.push({
        code: 'IVA',
        amount: taxItem,
        baseAmount: detailAmount,
        isExempt: false,
      })
      return acc
    }

    if (!taxItem || typeof taxItem !== 'object' || Array.isArray(taxItem)) {
      return acc
    }

    const tax = taxItem as Record<string, unknown>
    const code = typeof tax.code === 'string' && tax.code.trim() ? tax.code.trim() : 'IVA'
    const baseAmount = Number(tax.baseAmount ?? detailAmount)

    const directAmount = Number(tax.amount ?? tax.total)
    if (Number.isFinite(directAmount) && directAmount >= 0) {
      acc.push({
        ...tax,
        code,
        amount: directAmount,
        baseAmount: Number.isFinite(baseAmount) ? baseAmount : detailAmount,
        isExempt: Boolean(tax.isExempt),
      })
      return acc
    }

    const rate = Number(tax.rate ?? tax.percentage ?? tax.percent)
    if (Number.isFinite(rate) && rate >= 0) {
      const safeBase = Number.isFinite(baseAmount) ? baseAmount : detailAmount
      acc.push({
        ...tax,
        code,
        rate,
        baseAmount: safeBase,
        amount: (safeBase * rate) / 100,
        isExempt: Boolean(tax.isExempt),
      })
      return acc
    }

    acc.push({
      ...tax,
      code,
      baseAmount: Number.isFinite(baseAmount) ? baseAmount : detailAmount,
      isExempt: Boolean(tax.isExempt),
    })
    return acc
  }, [])
}

function buildSaleDetailsPayload(details: CreateSalePayload['details']) {
  return details.map((detail, index) => {
    const normalizedAmount =
      detail.amount !== undefined
        ? Number(detail.amount)
        : Number(detail.quantity) * Number(detail.unitAmount)

    const detailMetadata =
      detail.metadata && typeof detail.metadata === 'object' && !Array.isArray(detail.metadata)
        ? { ...detail.metadata }
        : {}

    const normalizedTaxes = detail.taxes !== undefined
      ? normalizeTaxes(normalizedAmount, detail.taxes)
      : null

    const normalizedUtility = detail.utility !== undefined && detail.utility !== null
      ? Number(detail.utility) || 0
      : null

    return {
      productId: detail.productId ?? null,
      lineNumber: detail.lineNumber ?? index + 1,
      description: detail.description ?? null,
      quantity: Number(detail.quantity),
      unitAmount: Number(detail.unitAmount),
      amount: normalizedAmount,
      taxes: normalizedTaxes,
      utility: normalizedUtility,
      metadata: Object.keys(detailMetadata).length ? detailMetadata : null,
    }
  })
}

function sumUtilityFromDetails(details: Array<{ utility?: number | null }>) {
  const total = details.reduce((sum, detail) => {
    if (detail.utility === undefined || detail.utility === null) return sum

    const utility = Number(detail.utility)
    return Number.isFinite(utility) && utility >= 0 ? sum + utility : sum
  }, 0)

  return total > 0 ? total : null
}

async function preloadSaleRelations(sale: Sale) {
  await sale.load('business', (q) => q.select(['id', 'name']))
  await sale.load('client', (q) => q.select(['id', 'name', 'identify', 'email']))
  if (sale.budgetId) {
    await sale.load('budget' as any, (q: any) =>
      q.select(['id', 'nro', 'client_id', 'status', 'enabled'])
    )
  }
  if (sale.shoppingId) {
    await sale.load('shopping', (q) => {
      q.select(['id', 'nro', 'provider_id', 'enabled', 'is_authorized'])
      q.preload('provider', (providerQ) => providerQ.select(['id', 'name', 'email']))
    })
  }
  await sale.load('createdBy', (builder) => {
    builder
      .preload('personalData', (pdQ) => pdQ.select('names', 'last_name_p', 'last_name_m'))
      .select(['id', 'personal_data_id', 'email'])
  })
  await sale.load('currency', (q) => q.select(['id', 'symbol', 'name']))
  await sale.load('details', (q) =>
    q.preload('product', (pq) => pq.select(['id', 'name', 'amount']))
  )
  await sale.load('payments', (q: any) =>
    q.whereNull('deleted_at').orderBy('date', 'desc').preload('coin').preload('ledgerMovement')
  )
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {}
}

async function validateSaleAssociations(
  trx: any,
  businessId: number,
  budgetId?: number | null,
  shoppingId?: number | null
) {
  if (budgetId !== undefined && budgetId !== null) {
    const budget = await Buget.query({ client: trx })
      .where('id', budgetId)
      .where('business_id', businessId)
      .whereNull('deleted_at')
      .first()

    if (!budget) {
      throw new Error('Budget not found for this business')
    }
  }

  if (shoppingId !== undefined && shoppingId !== null) {
    const shopping = await Shopping.query({ client: trx })
      .where('id', shoppingId)
      .where('business_id', businessId)
      .whereNull('deleted_at')
      .first()

    if (!shopping) {
      throw new Error('Purchase order not found for this business')
    }
  }
}

function sumTaxesFromDetail(detailAmount: number, taxes: unknown[]) {
  return taxes.reduce<number>((sum, taxItem) => {
    if (typeof taxItem === 'number') {
      return sum + taxItem
    }

    if (!taxItem || typeof taxItem !== 'object' || Array.isArray(taxItem)) {
      return sum
    }

    const tax = taxItem as Record<string, unknown>
    const directAmount = Number(tax.amount ?? tax.total)

    if (Number.isFinite(directAmount) && directAmount >= 0) {
      return sum + directAmount
    }

    const rate = Number(tax.rate ?? tax.percentage ?? tax.percent)
    if (Number.isFinite(rate) && rate >= 0) {
      const base = Number(tax.baseAmount ?? detailAmount)
      return sum + (Number.isFinite(base) ? (base * rate) / 100 : 0)
    }

    return sum
  }, 0)
}

function normalizeSiiStatusForUi(status: string | null | undefined) {
  switch (status) {
    case 'accepted':
      return 'accepted'
    case 'accepted_with_reparo':
      return 'accepted_with_reparo'
    case 'rejected':
      return 'rejected'
    case 'error':
      return 'error'
    case 'sent':
      return 'sent'
    case 'signed':
    case 'draft':
      return 'pending_send'
    default:
      return 'not_issued'
  }
}

function buildElectronicBillingSummaryFromSale(sale: Sale) {
  const metadata = asObject(sale.metadata)

  const summary = (Array.isArray(sale.details) ? sale.details : []).reduce(
    (acc, detail: any) => {
      const amount = Number(detail?.amount) || 0
      const detailMetadata = asObject(detail?.metadata)
      const taxes = Array.isArray(detail?.taxes)
        ? detail.taxes
        : Array.isArray(detailMetadata.taxes)
          ? detailMetadata.taxes
          : []

      acc.netAmount += amount
      acc.taxAmount += sumTaxesFromDetail(amount, taxes)

      return acc
    },
    {
      netAmount: 0,
      taxAmount: 0,
    }
  )

  const receiverRut =
    (typeof metadata.receiverRut === 'string' ? metadata.receiverRut : null) ??
    (typeof metadata.clientRut === 'string' ? metadata.clientRut : null) ??
    ((sale as any).client && typeof (sale as any).client.identify === 'string'
      ? (sale as any).client.identify
      : null)

  return {
    dteType: Number(asObject(metadata.electronicBilling).dteType ?? 33) || 33,
    issuerRut:
      ((sale as any).business && typeof (sale as any).business.identify === 'string'
        ? (sale as any).business.identify
        : null) ?? null,
    receiverRut,
    netAmount: summary.netAmount,
    exemptAmount: Number(asObject(metadata.electronicBilling).exemptAmount ?? 0) || 0,
    taxAmount: summary.taxAmount,
    totalAmount: Number(sale.totalAmount ?? summary.netAmount + summary.taxAmount),
  }
}

function serializeElectronicBillingDocument(document: SiiDteDocument | null) {
  if (!document) {
    return null
  }

  return {
    dteType: document.dteType,
    folio: document.folio,
    issuerRut: document.issuerRut,
    receiverRut: document.receiverRut,
    siiStatus: normalizeSiiStatusForUi(document.status),
    siiTrackId: document.siiTrackId,
    issuedAt: document.issuedAt?.toISO() ?? null,
    netAmount: document.netAmount,
    exemptAmount: document.exemptAmount,
    taxAmount: document.taxAmount,
    totalAmount: document.totalAmount,
    xmlUrl: document.xmlUrl,
    pdfUrl: document.pdfUrl,
    hasUnsignedXml: Boolean(document.xmlUnsigned),
    hasSignedXml: Boolean(document.xmlSigned),
    hasTedXml: Boolean(document.tedXml),
    lastError: document.lastError,
    generatedBy: 'backend',
  }
}

async function syncSaleElectronicBillingMetadata(
  sale: Sale,
  electronicBilling: Record<string, unknown> | null,
  trx?: any
) {
  const metadata = asObject(sale.metadata)
  metadata.electronicBilling = electronicBilling
  sale.metadata = metadata

  if (trx) {
    sale.useTransaction(trx)
  }

  await sale.save()
}

async function findLatestElectronicBillingDocument(saleId: number, businessId?: number, trx?: any) {
  const query = SiiDteDocument.query(trx ? { client: trx } : undefined)
    .where('sale_id', saleId)
    .orderBy('id', 'desc')

  if (businessId) {
    query.where('business_id', businessId)
  }

  return query.first()
}

export default class SaleService {
  public static async create(payload: CreateSalePayload) {
    const trx = await db.transaction()

    try {
      const parsedSaleDate = payload.saleDate ? DateTime.fromISO(payload.saleDate) : null
      await validateSaleAssociations(trx, payload.businessId, payload.budgetId, payload.shoppingId)
      const computedTotal = payload.details.reduce((acc, detail) => {
        const lineAmount =
          detail.amount !== undefined
            ? Number(detail.amount)
            : Number(detail.quantity) * Number(detail.unitAmount)
        return acc + lineAmount
      }, 0)
      const computedUtility = sumUtilityFromDetails(payload.details)

      const normalizedUtility =
        payload.utility !== undefined
          ? payload.utility === null
            ? null
            : Number(payload.utility) || 0
          : computedUtility

      const sale = await Sale.create(
        {
          businessId: payload.businessId,
          createdById: payload.createdById,
          clientId: payload.clientId,
          budgetId: payload.budgetId ?? null,
          shoppingId: payload.shoppingId ?? null,
          billNumber: payload.billNumber ?? null,
          title: payload.title ?? null,
          description: payload.description ?? null,
          saleDate: parsedSaleDate && parsedSaleDate.isValid ? parsedSaleDate : null,
          status: payload.status ?? 'unpaid',
          totalAmount: payload.totalAmount ?? computedTotal,
          utility: normalizedUtility,
          currencyId: payload.currencyId ?? null,
          metadata: normalizeSaleMetadata(payload),
        },
        { client: trx }
      )

      const detailsPayload = buildSaleDetailsPayload(payload.details)

      await sale.related('details').createMany(detailsPayload, { client: trx })

      await trx.commit()

      await preloadSaleRelations(sale)

      return sale
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  public static async update(saleId: number, payload: UpdateSalePayload, businessId?: number) {
    const trx = await db.transaction()

    try {
      const saleQuery = Sale.query({ client: trx }).where('id', saleId).whereNull('deleted_at')

      if (businessId) {
        saleQuery.where('business_id', businessId)
      }

      const sale = await saleQuery.firstOrFail()
      const parsedSaleDate = payload.saleDate ? DateTime.fromISO(payload.saleDate) : null
      await validateSaleAssociations(trx, sale.businessId, payload.budgetId, payload.shoppingId)

      let totalAmount = sale.totalAmount
      let utility = sale.utility
      if (payload.details) {
        totalAmount = payload.details.reduce((acc, detail) => {
          const lineAmount =
            detail.amount !== undefined
              ? Number(detail.amount)
              : Number(detail.quantity) * Number(detail.unitAmount)
          return acc + lineAmount
        }, 0)

        if (payload.utility === undefined) {
          utility = sumUtilityFromDetails(payload.details)
        }
      }
      if (payload.totalAmount !== undefined) {
        totalAmount = payload.totalAmount
      }
      if (payload.utility !== undefined) {
        utility = payload.utility === null ? null : Number(payload.utility) || 0
      }

      if (payload.title !== undefined) sale.title = payload.title
      if (payload.billNumber !== undefined) sale.billNumber = payload.billNumber
      if (payload.description !== undefined) sale.description = payload.description
      if (payload.clientId !== undefined) sale.clientId = payload.clientId
      if (payload.budgetId !== undefined) sale.budgetId = payload.budgetId
      if (payload.shoppingId !== undefined) sale.shoppingId = payload.shoppingId
      if (payload.saleDate !== undefined) {
        sale.saleDate = parsedSaleDate && parsedSaleDate.isValid ? parsedSaleDate : null
      }
      if (payload.status !== undefined) sale.status = payload.status
      if (payload.currencyId !== undefined) sale.currencyId = payload.currencyId
      if (totalAmount !== undefined) sale.totalAmount = totalAmount
      if (utility !== undefined) sale.utility = utility

      if (payload.metadata !== undefined || payload.banks !== undefined) {
        sale.metadata = mergeSaleMetadata(sale.metadata, payload)
      }

      await sale.save()

      if (payload.details) {
        await sale.related('details').query().useTransaction(trx).delete()
        const detailsPayload = buildSaleDetailsPayload(payload.details)
        await sale.related('details').createMany(detailsPayload, { client: trx })
      }

      await trx.commit()

      await preloadSaleRelations(sale)

      return sale
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  public static async updateStatus(
    saleId: number,
    status: SaleStatus,
    businessId?: number
  ) {
    const saleQuery = Sale.query().where('id', saleId).whereNull('deleted_at')

    if (businessId) {
      saleQuery.where('business_id', businessId)
    }

    const sale = await saleQuery.firstOrFail()

    sale.status = status
    await sale.save()

    return sale
  }

  public static async delete(saleId: number, businessId?: number) {
    const saleQuery = Sale.query().where('id', saleId).whereNull('deleted_at')

    if (businessId) {
      saleQuery.where('business_id', businessId)
    }

    const sale = await saleQuery.firstOrFail()
    sale.deletedAt = DateTime.now()
    await sale.save()
  }

  public static async issueElectronicBilling(saleId: number, businessId?: number) {
    const saleQuery = Sale.query().where('id', saleId).whereNull('deleted_at')

    if (businessId) {
      saleQuery.where('business_id', businessId)
    }

    const sale = await saleQuery.firstOrFail()

    if (sale.status !== 'paid') {
      throw new Error('Only paid sales can issue electronic billing')
    }

    await sale.load('business', (q) => q.select(['id', 'identify', 'name', 'address']))
    await sale.load('client', (q) => q.select(['id', 'identify', 'name', 'giro', 'address']))
    await sale.load('details', (q) =>
      q.select(['id', 'sale_id', 'line_number', 'description', 'quantity', 'unit_amount', 'amount', 'taxes', 'metadata'])
    )

    const existingDocument = await findLatestElectronicBillingDocument(sale.id, businessId)

    if (existingDocument && existingDocument.status !== 'canceled') {
      await syncSaleElectronicBillingMetadata(
        sale,
        serializeElectronicBillingDocument(existingDocument) as Record<string, unknown>
      )
      await preloadSaleRelations(sale)
      return sale
    }

    const summary = buildElectronicBillingSummaryFromSale(sale)
    const allocation = await CafService.allocateNextFolio(sale.businessId, summary.dteType)
    const issuedAt = DateTime.now()
    const cafFile = await SiiCafFile.findOrFail(allocation.cafId)
    const draftArtifacts = SiiXmlBuilderService.buildDraftArtifacts({
      sale: sale as Sale,
      cafFile,
      dteType: summary.dteType,
      folio: allocation.folio,
      issuedAt,
      issuerRut: summary.issuerRut,
      receiverRut: summary.receiverRut,
      netAmount: summary.netAmount,
      exemptAmount: summary.exemptAmount,
      taxAmount: summary.taxAmount,
      totalAmount: summary.totalAmount,
    })
    const signedXml = XmlSignatureService.isConfigured()
      ? XmlSignatureService.signDteXml(draftArtifacts.xmlUnsigned)
      : null
    const trx = await db.transaction()

    try {
      sale.useTransaction(trx)

      const document = await SiiDteDocument.create(
        {
          saleId: sale.id,
          businessId: sale.businessId,
          cafFileId: allocation.cafId,
          dteType: summary.dteType,
          folio: allocation.folio,
          status: signedXml ? 'signed' : 'draft',
          siiTrackId: null,
          issuerRut: summary.issuerRut,
          receiverRut: summary.receiverRut,
          issuedAt,
          netAmount: summary.netAmount,
          exemptAmount: summary.exemptAmount,
          taxAmount: summary.taxAmount,
          totalAmount: summary.totalAmount,
          xmlUnsigned: draftArtifacts.xmlUnsigned,
          xmlSigned: signedXml,
          tedXml: draftArtifacts.tedXml,
          tedSignature: draftArtifacts.tedSignature,
          xmlUrl: null,
          pdfUrl: null,
          lastError: null,
        },
        { client: trx }
      )

      await SiiDteEvent.create(
        {
          dteDocumentId: document.id,
          eventType: 'issued',
          payloadJson: {
            saleId: sale.id,
            businessId: sale.businessId,
            dteType: summary.dteType,
            folio: allocation.folio,
            cafId: allocation.cafId,
            hasUnsignedXml: Boolean(draftArtifacts.xmlUnsigned),
            hasSignedXml: Boolean(signedXml),
            hasTedXml: Boolean(draftArtifacts.tedXml),
            hasTedSignature: Boolean(draftArtifacts.tedSignature),
            signingConfigured: XmlSignatureService.isConfigured(),
          },
        },
        { client: trx }
      )

      if (signedXml) {
        await SiiDteEvent.create(
          {
            dteDocumentId: document.id,
            eventType: 'signed',
            payloadJson: {
              saleId: sale.id,
              businessId: sale.businessId,
              dteType: summary.dteType,
              folio: allocation.folio,
              hasSignedXml: true,
            },
          },
          { client: trx }
        )
      }

      await syncSaleElectronicBillingMetadata(
        sale,
        serializeElectronicBillingDocument(document) as Record<string, unknown>,
        trx
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }

    await preloadSaleRelations(sale)

    return sale
  }

  public static async getElectronicBillingStatus(saleId: number, businessId?: number) {
    const saleQuery = Sale.query().where('id', saleId).whereNull('deleted_at')

    if (businessId) {
      saleQuery.where('business_id', businessId)
    }

    const sale = await saleQuery.firstOrFail()
    const document = await findLatestElectronicBillingDocument(sale.id, businessId)

    if (document) {
      const serialized = serializeElectronicBillingDocument(document)
      await syncSaleElectronicBillingMetadata(sale, serialized as Record<string, unknown>)
      return serialized
    }

    const metadata = asObject(sale.metadata)

    return metadata.electronicBilling ?? null
  }
}
