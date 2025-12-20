import vine from '@vinejs/vine'

export const notificationStoreValidator = vine.compile(
    vine.object({
        notificationTypeId: vine.number().positive().optional(),
        businessId: vine.number().positive().optional(),
        title: vine.string().trim(),
        body: vine.string().trim().optional(),
        payload: vine.object({}).optional(),
        recipientBusinessUserIds: vine.array(vine.number().positive()).optional(),
    })
)

export const notificationIndexValidator = vine.compile(
    vine.object({
        page: vine.number().positive().optional(),
        perPage: vine.number().positive().optional(),
        status: vine.enum(['unread', 'read', 'archived']).optional(),
    })
)
