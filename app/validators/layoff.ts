import vine from '@vinejs/vine'

export const layoffStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        code: vine.string().trim().unique({ table: 'setting_layoffs', column: 'code' }),
    })
)

export const layoffUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        code: vine.string().trim().optional(),
    })
)
