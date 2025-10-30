import vine from '@vinejs/vine'

export const positionStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        name: vine.string().trim(),
        code: vine.string().trim(),
        lat: vine.number().optional(),
        log: vine.number().optional(),
    })
)

export const positionUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        code: vine.string().trim().optional(),
        lat: vine.number().optional(),
        log: vine.number().optional(),
    })
)
