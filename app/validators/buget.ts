import vine from '@vinejs/vine'

// Shared nested schemas
const periodSchema = vine.object({
  period: vine.number(),
})

const productSchema = vine.object({
  id: vine.number(),
  name: vine.string().optional(),
  amount: vine.number().optional(),
  amountDefault: vine.number().optional(),
  count: vine.number().optional(),
  tax: vine.number().optional(),
  countPerson: vine.number().optional(),
  period: periodSchema,
})

const itemSchema = vine.object({
  id: vine.number(),
  withTitle: vine.boolean(),
  title: vine.string().nullable().optional(),
  typeId: vine.number(),
  value: vine.string(),
})

// Banks can be numbers or objects with accountId; accept any and let controller normalize
const bankAny = vine.any()

const clientSchema = vine.object({ id: vine.number() }).optional()

const clientDetailsSchema = vine
  .object({
    costCenter: vine.string().nullable().optional(),
    work: vine.string().nullable().optional(),
    observation: vine.string().nullable().optional(),
  })
  .optional()

export const bugetStoreValidator = vine.compile(
  vine.object({
    businessId: vine.number(),
    currencySymbol: vine.string().optional(),
    currencyId: vine.number().optional(),
    currencyValue: vine.number().optional(),

    client: clientSchema,

    products: vine.array(productSchema),
    items: vine.array(itemSchema).optional(),
    banks: vine.array(bankAny).optional(),

    discount: vine.number().optional(),
    utility: vine.number().optional(),

    clientDetails: clientDetailsSchema,
    keepSameNro: vine.boolean().optional(),
  })
)

export const bugetUpdateValidator = vine.compile(
  vine.object({
    currencySymbol: vine.string().optional(),
    currencyId: vine.number().optional(),
    currencyValue: vine.number().optional(),

    products: vine.array(productSchema).optional(),
    items: vine.array(itemSchema).optional(),
    banks: vine.array(bankAny).optional(),

    discount: vine.number().optional(),
    utility: vine.number().optional(),

    clientDetails: clientDetailsSchema,
    keepSameNro: vine.boolean().optional(),
  })
)

export const bugetFindByNroValidator = vine.compile(
  vine.object({
    businessId: vine.number(),
    number: vine.string(),
  })
)

export const bugetFindByNameClientValidator = vine.compile(
  vine.object({
    businessId: vine.number(),
    name: vine.string(),
    page: vine.number().optional(),
    perPage: vine.number().optional(),
    status: vine.enum(['enabled', 'disabled']).optional(),
    budgetStatus: vine.enum(['pending', 'revision', 'reject', 'accept']).optional(),
  })
)

export const bugetFindByDateValidator = vine.compile(
  vine.object({
    businessId: vine.number(),
    date: vine.date(),
    page: vine.number().optional(),
    perPage: vine.number().optional(),
    status: vine.enum(['enabled', 'disabled']).optional(),
    budgetStatus: vine.enum(['pending', 'revision', 'reject', 'accept']).optional(),
  })
)

export const bugetChangeClientValidator = vine.compile(
  vine.object({
    clientId: vine.number(),
  })
)

export const bugetObservationValidator = vine.compile(
  vine.object({
    message: vine.string().trim().minLength(1).maxLength(1024),
  })
)

export const bugetStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(['revision', 'reject', 'accept'] as const),
    observation: vine.string().trim().minLength(1).maxLength(1024).optional(),
  })
)
