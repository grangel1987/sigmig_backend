import vine from '@vinejs/vine'

export const isapreStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        code: vine.string().trim().unique({ table: 'setting_isapres', column: 'code' }),
        type: vine.number(),
        value: vine.number(),
    })
)

export const isapreUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        code: vine.string().trim().optional(),
        type: vine.number().optional(),
        value: vine.number().optional(),
    })
)
