import vine from '@vinejs/vine'

export const settingScheduleStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        name: vine.string().trim().minLength(1),
        workDays: vine.string().optional(),
        daysOff: vine.string().optional(),
        events: vine.string().optional(),
        minFlexIn: vine.number().optional(),
        minFlexOut: vine.number().optional(),
    })
)

export const settingScheduleUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        workDays: vine.string().optional(),
        daysOff: vine.string().optional(),
        events: vine.string().optional(),
    })
)
