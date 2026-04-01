import vine from '@vinejs/vine'

export const unitTypeStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        type: vine.string().trim().optional(),
    })
)

export const unitTypeUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        type: vine.string().trim().optional(),
    })
)
