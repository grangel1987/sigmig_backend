import vine from '@vinejs/vine'

export const typeContractStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
    })
)

export const typeContractUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
    })
)
