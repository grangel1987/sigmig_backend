import vine from '@vinejs/vine'

export const exRegimeStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
    })
)

export const exRegimeUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
    })
)
