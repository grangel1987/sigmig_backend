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

const clientDetailsSchema = vine.object({
    costCenter: vine.string().nullable().optional(),
    work: vine.string().nullable().optional(),
    observation: vine.string().nullable().optional(),
}).optional()

export const bugetStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number(),
        currencySymbol: vine.string().optional().nullable(),
        currencyId: vine.number().optional().nullable(),
        currencyValue: vine.number().optional().nullable(),

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
        currencySymbol: vine.string().optional().nullable(),
        currencyId: vine.number().optional().nullable(),
        currencyValue: vine.number().optional().nullable(),

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
    })
)

export const bugetFindByDateValidator = vine.compile(
    vine.object({
        businessId: vine.number(),
        date: vine.date(),
        page: vine.number().optional(),
        perPage: vine.number().optional(),
        status: vine.enum(['enabled', 'disabled']).optional(),

    })
)

export const bugetChangeClientValidator = vine.compile(
    vine.object({
        currencySymbol: vine.string().optional().nullable(),
        currencyId: vine.number().optional().nullable(),
        currencyValue: vine.number().optional().nullable(),

        client: clientSchema,
        clientId: vine.number().optional(),

        products: vine.array(productSchema).optional(),
        items: vine.array(itemSchema).optional(),
        banks: vine.array(bankAny).optional(),

        discount: vine.number().optional(),
        utility: vine.number().optional(),

        clientDetails: clientDetailsSchema,
    })
)
