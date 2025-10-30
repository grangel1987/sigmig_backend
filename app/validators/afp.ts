import vine from '@vinejs/vine'

export const afpStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        code: vine.string().trim().unique({ table: 'setting_afps', column: 'code' }),
    })
)

export const afpUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        code: vine.string().trim().optional(),
    })
)
