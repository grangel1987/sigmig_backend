import vine from '@vinejs/vine'

export const assetStoreValidator = vine.compile(
    vine.object({
        code: vine.string().trim().unique({ table: 'setting_assets', column: 'code' }),
        name: vine.string().trim(),
        type: vine.string(),
        taxable: vine.boolean(),
        tributable: vine.boolean(),
        gratifying: vine.boolean(),
        extraHours: vine.boolean(),
    })
)

export const assetUpdateValidator = vine.compile(
    vine.object({
        code: vine.string().trim().optional(),
        name: vine.string().trim().optional(),
        type: vine.string().optional(),
        taxable: vine.boolean().optional(),
        tributable: vine.boolean().optional(),
        gratifying: vine.boolean().optional(),
        extraHours: vine.boolean().optional(),
    })
)
