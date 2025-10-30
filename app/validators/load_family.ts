import vine from '@vinejs/vine'

export const loadFamilyStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
    })
)

export const loadFamilyUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
    })
)
