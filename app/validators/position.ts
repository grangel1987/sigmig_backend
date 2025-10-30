import vine from '@vinejs/vine'

// Create: required-by-default
export const positionStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        name: vine.string().trim(),
    })
)

// Update: all fields optional
export const positionUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
    })
)
