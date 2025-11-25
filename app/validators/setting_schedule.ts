import vine from '@vinejs/vine'

export const settingScheduleStoreValidator = vine.compile(
    vine.object({
        businessId: vine.number().positive(),
        name: vine.string().trim().minLength(1),
        workDays: vine.number(),
        daysOff: vine.number(),
        events: vine.string(),
        minFlexIn: vine.number(),
        minFlexOut: vine.number(),
    })
)

export const settingScheduleUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().trim().optional(),
        workDays: vine.number().optional(),
        daysOff: vine.number().optional(),
        events: vine.string().optional(),
    })
)
