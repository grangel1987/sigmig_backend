import vine from '@vinejs/vine'

export const affiliationStoreValidator = vine.compile(
    vine.object({
        code: vine.string().trim().unique({ table: 'setting_affiliations', column: 'code' }),
        name: vine.string().trim(),
    })
)

export const affiliationUpdateValidator = vine.compile(
    vine.object({
        code: vine.string().trim().optional(),
        name: vine.string().trim().optional(),
    })
)
