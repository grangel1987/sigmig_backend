import vine from '@vinejs/vine'

export const bookingItemStoreValidator = vine.compile(
    vine.object({
        name: vine.string(),
        isRoom: vine.boolean(),
        isQuantity: vine.boolean(),
        description: vine.string(),
    })
)

export const bookingItemUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().optional(),
        isRoom: vine.boolean().optional(),
        isQuantity: vine.boolean().optional(),
        description: vine.string().optional(),
    })
)

export const bookingNoteStoreValidator = vine.compile(
    vine.object({
        note: vine.string(),
    })
)

export const bookingNoteUpdateValidator = vine.compile(
    vine.object({
        note: vine.string().optional(),
    })
)

export const bookingPropertyStoreValidator = vine.compile(
    vine.object({
        name: vine.string(),
        manyRooms: vine.number(),
        description: vine.string(),
        numberMaxPerson: vine.number(),
    })
)

export const bookingPropertyUpdateValidator = vine.compile(
    vine.object({
        name: vine.string().optional(),
        manyRooms: vine.number().optional(),
        description: vine.string().optional(),
        numberMaxPerson: vine.number().optional(),
    })
)
