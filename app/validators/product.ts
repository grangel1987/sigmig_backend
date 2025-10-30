import vine from '@vinejs/vine'

export const productStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        typeId: vine.number().positive(),
        name: vine.string().trim(),
        count: vine.number().positive(),
        amount: vine.number().positive(),
        period: vine.number().positive().optional(),
        periodCount: vine.number().positive().optional(),
    })
)


export const productUpdateValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive().optional(),
        typeId: vine.number().positive().optional(),
        name: vine.string().trim().optional(),
        count: vine.number().positive().optional(),
        amount: vine.number().positive().optional(),
        period: vine.number().positive().optional(),
        periodCount: vine.number().positive().optional(),
    })
)