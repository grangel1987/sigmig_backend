import vine from '@vinejs/vine'

export const shoppingStoreValidator = vine.compile(
    vine.object({
        business_id: vine.number().positive(),
        currency_symbol: vine.string().trim().minLength(1).maxLength(50),
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
                    quantity: vine.number().positive().optional(),
                })
            )
            .optional(),
        cost_center: vine.number().positive().optional(),
        work: vine.number().positive().optional(),
        rounding: vine.number().optional(),
        info: vine.object({
            name: vine.string().trim().minLength(1),
            payment_term: vine.number().positive().optional(),
            send_condition: vine.number().positive().optional(),
            send_amount: vine.number().min(0).optional(),
            other_amount: vine.number().min(0).optional(),
            observation: vine.string().trim().optional(),
            days_expire_buget: vine.number().min(0).optional(),
            authorizer_id: vine.number().positive().optional(),
            nro_buget: vine.string().trim().maxLength(50).optional(),
        }),
    })
)

export const shoppingFindByNameProviderValidator = vine.compile(
    vine.object({
        business_id: vine.number().positive(),
        name: vine.string().trim().minLength(1),
    })
)

export const shoppingFindByDateValidator = vine.compile(
    vine.object({
        business_id: vine.number().positive(),
        date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
)

export const shoppingUpdateNroBugetValidator = vine.compile(
    vine.object({
        nro_buget: vine.string().trim().minLength(1).maxLength(50),
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
