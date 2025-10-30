import vine from '@vinejs/vine'

export const countryIdParamValidator = vine.compile(
    vine.object({
        id: vine.number().positive(),
    })
)
