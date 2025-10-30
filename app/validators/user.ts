import vine from '@vinejs/vine'

export const userResetPasswordValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        userId: vine.number().positive(),
    })
)
