import vine from '@vinejs/vine'

export const shoppingStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        currencySymbol: vine.string().trim().minLength(1).maxLength(50),
        provider: vine.object({
            id: vine.number().positive(),
        }),
        products: vine
            .array(
                vine.object({
                    id: vine.number().positive().optional(),
                    name: vine.string().trim().optional(),
                    code: vine.string().trim().optional(),
                    price: vine.number().min(0).optional(),
                    tax: vine.number().range([0, 100]).optional(),
                    count: vine.number().positive(),
                })
            )
            .optional(),
        costCenter: vine.number().positive().optional(),
        work: vine.number().positive().optional(),
        rounding: vine.number().optional(),
        info: vine.object({
            name: vine.string().trim().minLength(1),
            paymentTerm: vine.number().positive().optional(),
            sendCondition: vine.number().positive().optional(),
            sendAmount: vine.number().min(0).optional(),
            otherAmount: vine.number().min(0).optional(),
            observation: vine.string().trim().optional(),
            daysExpireBuget: vine.number().min(0).optional(),
            authorizerId: vine.number().positive().optional(),
            nroBuget: vine.string().trim().maxLength(50).optional(),
        }),
    })
)

export const shoppingFindByNameProviderValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        name: vine.string().trim().minLength(1),
    })
)

export const shoppingFindByDateValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
)

export const shoppingUpdateNroBugetValidator = vine.compile(
    vine.object({
        nroBuget: vine.string().trim().minLength(1).maxLength(50),
    })
)

export const shoppingIdParamValidator = vine.compile(
    vine.object({
        id: vine.number().positive(),
    })
)

export const shoppingShopIdParamValidator = vine.compile(
    vine.object({
        shop_id: vine.number().positive(),
    })
)

export const shoppingTokenParamValidator = vine.compile(
    vine.object({
        token: vine.string().trim().minLength(1),
    })
)
