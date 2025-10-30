import vine from '@vinejs/vine'

export const certificateHealthItemStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        type: vine.string(),
        position: vine.number(),
    })
)

export const certificateHealthItemUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        type: vine.string().optional(),
        position: vine.number().optional(),
    })
)
