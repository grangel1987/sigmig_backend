import vine from '@vinejs/vine'

export const providerStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        address: vine.string().trim().optional(),
        city_id: vine.number().positive().optional(),
        phone: vine.string().trim().optional(),
        email: vine.string().email().optional(),
    })
)

export const providerUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        address: vine.string().trim().optional(),
        city_id: vine.number().positive().optional(),
        phone: vine.string().trim().optional(),
        email: vine.string().email().optional(),
    })
)


export const providerProductStoreValidator = vine.compile(
    vine.object({
        provider_id: vine.number().positive(),
        code: vine.string().trim().optional(),
        name: vine.string().trim(),
    })
)