import vine from '@vinejs/vine'

export const accountStoreValidator = vine.compile(
    vine.object({
        bankId: vine.number(),
        number: vine.string(),
        owner: vine.string(),
        typeIdentifyId: vine.number(),
        typeAccountId: vine.number(),
        identify: vine.string(),
    })
)

export const accountUpdateValidator = vine.compile(
    vine.object({
        bankId: vine.number().optional(),
        number: vine.string().optional(),
        owner: vine.string().optional(),
        typeIdentifyId: vine.number().optional(),
        typeAccountId: vine.number().optional(),
        identify: vine.string().optional(),
    })
)
