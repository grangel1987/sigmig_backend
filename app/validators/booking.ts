import vine from '@vinejs/vine'

export const bookingStoreValidator = vine.compile(
    vine.object({
        clientId: vine.number().positive(),
        booking: vine.object({
            checkIn: vine.string().trim().minLength(10),
            checkOut: vine.string().trim().minLength(10),
            type: vine.string().trim().minLength(1),
            monthQuantity: vine.number(),
        }),
        // Require presence of arrays, they may be empty but must be provided
        guests: vine.array(
            vine.object({
                name: vine.string().trim().minLength(1),
                identifyTypeId: vine.number().positive(),
                identify: vine.string().trim().minLength(1),
                lastName: vine.string().trim().optional(),
                phone: vine.string().trim().optional(),
                email: vine.string().trim().optional(),
                fromWhere: vine.string().trim().optional(),
                answer1: vine.boolean().optional(),
                answer2: vine.boolean().optional(),
                mobilityPassUrlShort: vine.string().trim().optional(),
                mobilityPassUrl: vine.string().trim().optional(),
            })
        ),
        propertie: vine.object({
            propertieId: vine.number().positive(),
            propertieView: vine.any().optional(),
        }),
        items: vine.array(
            vine.object({
                itemId: vine.number().positive(),
                quantity: vine.number().min(0),
            })
        ),
        feeding: vine.array(
            vine.object({
                feeding: vine.string().trim().minLength(1),
                count: vine.number().min(0),
            })
        ),
    })
)

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
