import vine from '@vinejs/vine'

export const notificationTypeStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim(),
        code: vine.string().trim().optional(),
        description: vine.string().trim().optional(),
        enabled: vine.boolean().optional(),
        channel: vine.string().trim().optional(),
        severity: vine.string().trim().optional(),
        businessUsers: vine.array(vine.number().positive()).optional(),
        rols: vine.array(vine.number().positive()).optional(),
    })
)

export const notificationTypeUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        code: vine.string().trim().optional(),
        description: vine.string().trim().optional(),
        enabled: vine.boolean().optional(),
        channel: vine.string().trim().optional(),
        severity: vine.string().trim().optional(),
        businessUsers: vine.array(vine.number().positive()).optional(),
        rols: vine.array(vine.number().positive()).optional(),
    })
)
