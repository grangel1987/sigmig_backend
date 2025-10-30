import vine from '@vinejs/vine'

export const countryUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1).optional(),
        prefix: vine.string().trim().minLength(1).optional(),
        nationality: vine.string().trim().minLength(1).optional(),
    })
)
