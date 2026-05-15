import vine from '@vinejs/vine'

const saleTaxSchema = vine.object({
  code: vine.string().trim().minLength(1),
  rate: vine.number().min(0).optional().nullable(),
  baseAmount: vine.number().min(0).optional().nullable(),
  amount: vine.number().min(0).optional().nullable(),
  total: vine.number().min(0).optional().nullable(),
  percentage: vine.number().min(0).optional().nullable(),
  percent: vine.number().min(0).optional().nullable(),
  isExempt: vine.boolean().optional().nullable(),
})

const saleDetailSchema = vine.object({
  productId: vine.number().positive().optional().nullable(),
  lineNumber: vine.number().positive().optional().nullable(),
  description: vine.string().trim().optional().nullable(),
  quantity: vine.number().positive(),
  unitAmount: vine.number().min(0),
  amount: vine.number().min(0).optional(),
  taxes: vine.array(saleTaxSchema).optional().nullable(),
  utility: vine.number().min(0).optional().nullable(),
  metadata: vine.any().optional(),
})

const saleFinanceSchema = {
  banks: vine.array(vine.any()).optional().nullable(),
  metadata: vine.any().optional(),
}

export const saleOverviewValidator = vine.compile(
  vine.object({
    businessId: vine.number().positive().optional(),
    status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const).optional(),
    startDate: vine.string().trim().optional(),
    endDate: vine.string().trim().optional(),
  })
)

export const saleIndexValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    perPage: vine.number().positive().optional(),
    text: vine.string().trim().optional(),
    businessId: vine.number().positive().optional(),
    status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const).optional(),
  })
)

export const saleStoreValidator = vine.compile(
  vine.object({
    businessId: vine.number().positive().optional(),
    clientId: vine.number().positive(),
    title: vine.string().trim().optional().nullable(),
    description: vine.string().trim().optional().nullable(),
    saleDate: vine.string().trim().optional().nullable(),
    status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const).optional(),
    currencyId: vine.number().positive().optional().nullable(),
    coinId: vine.number().positive().optional().nullable(),
    invoiced: vine.boolean().optional(),
    totalAmount: vine.number().min(0).optional().nullable(),
    utility: vine.number().min(0).optional().nullable(),
    ...saleFinanceSchema,
    details: vine.array(saleDetailSchema).minLength(1),
  })
)

export const saleUpdateValidator = vine.compile(
  vine.object({
    clientId: vine.number().positive().optional(),
    title: vine.string().trim().optional().nullable(),
    description: vine.string().trim().optional().nullable(),
    saleDate: vine.string().trim().optional().nullable(),
    status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const).optional(),
    currencyId: vine.number().positive().optional().nullable(),
    coinId: vine.number().positive().optional().nullable(),
    invoiced: vine.boolean().optional(),
    totalAmount: vine.number().min(0).optional().nullable(),
    utility: vine.number().min(0).optional().nullable(),
    ...saleFinanceSchema,
    details: vine.array(saleDetailSchema).minLength(1).optional(),
  })
)

export const saleUpdateStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const),
  })
)

export const salePaymentStoreValidator = vine.compile(
  vine.object({
    saleId: vine.number().positive(),
    accountId: vine.number().positive().optional(),
    costCenterId: vine.number().positive().optional(),
    date: vine.string().trim(),
    dueDate: vine.string().trim().optional().nullable(),
    amount: vine.number().positive(),
    currencyId: vine.number().positive().optional(),
    coinId: vine.number().positive().optional(),
    paymentMethodId: vine.number().positive().optional(),
    documentTypeId: vine.number().positive().optional(),
    documentNumber: vine.string().trim().optional().nullable(),
    concept: vine.string().trim().optional().nullable(),
    status: vine.enum(['paid', 'pending', 'voided'] as const).optional(),
    isProjected: vine.boolean().optional(),
    receivedAt: vine.string().trim().optional().nullable(),
    invoiced: vine.boolean().optional(),
    invoiceMeta: vine.any().optional().nullable(),
  })
)

export const salePaymentUpdateValidator = vine.compile(
  vine.object({
    accountId: vine.number().positive().optional(),
    costCenterId: vine.number().positive().optional(),
    clientId: vine.number().positive().optional(),
    date: vine.string().trim().optional(),
    dueDate: vine.string().trim().optional().nullable(),
    amount: vine.number().positive().optional(),
    currencyId: vine.number().positive().optional(),
    coinId: vine.number().positive().optional(),
    paymentMethodId: vine.number().positive().optional(),
    documentTypeId: vine.number().positive().optional(),
    documentNumber: vine.string().trim().optional().nullable(),
    concept: vine.string().trim().optional().nullable(),
    status: vine.enum(['paid', 'pending', 'voided'] as const).optional(),
    isProjected: vine.boolean().optional(),
    receivedAt: vine.string().trim().optional().nullable(),
    invoiced: vine.boolean().optional(),
    invoiceMeta: vine.any().optional().nullable(),
  })
)

export const salePaymentSettleValidator = vine.compile(
  vine.object({
    documentNumber: vine.string().trim().minLength(1),
    documentTypeId: vine.number().positive().optional(),
  })
)

export const saleIdParamValidator = vine.compile(
  vine.object({
    id: vine.number().positive(),
  })
)
