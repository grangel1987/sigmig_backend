import vine from '@vinejs/vine'

export const discountStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        type: vine.string(),
        code: vine.string().trim(),
    })
)

export const discountUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        type: vine.string().optional(),
        code: vine.string().trim().optional(),
    })
)
