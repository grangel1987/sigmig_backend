import vine from '@vinejs/vine'

const saleDetailSchema = vine.object({
    productId: vine.number().positive().optional().nullable(),
    lineNumber: vine.number().positive().optional().nullable(),
    description: vine.string().trim().optional().nullable(),
    quantity: vine.number().positive(),
    unitAmount: vine.number().min(0),
    amount: vine.number().min(0).optional(),
    metadata: vine.any().optional(),
})

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
        title: vine.string().trim().optional().nullable(),
        description: vine.string().trim().optional().nullable(),
        saleDate: vine.string().trim().optional().nullable(),
        status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const).optional(),
        currencyId: vine.number().positive().optional().nullable(),
        coinId: vine.number().positive().optional().nullable(),
        invoiced: vine.boolean().optional(),
        totalAmount: vine.number().min(0).optional().nullable(),
        metadata: vine.any().optional(),
        details: vine.array(saleDetailSchema).minLength(1),
    })
)

export const saleUpdateStatusValidator = vine.compile(
    vine.object({
        status: vine.enum(['draft', 'pending', 'confirmed', 'canceled'] as const),
    })
)

export const saleIdParamValidator = vine.compile(
    vine.object({
        id: vine.number().positive(),
    })
)
