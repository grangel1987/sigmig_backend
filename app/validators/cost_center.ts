import vine from '@vinejs/vine'

export const costCenterStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        name: vine.string().trim(),
        accounting: vine.boolean().optional(),
        code: vine.string().trim(),
    })
)

export const costCenterUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        accounting: vine.boolean().optional(),
        code: vine.string().trim().optional(),
    })
)

export const costCenterSelectValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        accounting: vine.boolean().optional(),
    })
)
