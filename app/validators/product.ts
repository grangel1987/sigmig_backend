import vine from '@vinejs/vine'

export const productStoreValidator = vine.compile(
    vine.object({
        business_id: vine.number().positive(),
        type_id: vine.number().positive(),
        name: vine.string().trim(),
        count: vine.number().positive(),
        amount: vine.number().positive(),
        period: vine.number().positive().optional(),
        period_count: vine.number().positive().optional(),
    })
)


export const productUpdateValidator = vine.compile(
    vine.object({
        id: vine.number().positive(),
        business_id: vine.number().positive(),
        type_id: vine.number().positive(),
        name: vine.string().trim(),
        count: vine.number().positive(),
        amount: vine.number().positive(),
        period: vine.number().positive().optional(),
        period_count: vine.number().positive().optional(),
    })
)