import vine from '@vinejs/vine'

export const settingLegalGratificationStoreValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1),
    })
)

export const settingLegalGratificationUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().minLength(1),
    })
)
