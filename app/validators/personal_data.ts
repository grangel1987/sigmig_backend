import vine from '@vinejs/vine'

// PersonalData validator aligned with DB schema nullability & length constraints.
// Required (NOT NULL) columns: names, last_name_p, last_name_m, email.
// Others are nullable/optional in the schema and thus optional here.
// Length constraints: names/last names 100, identify 50, email 191, phone/movil 20.
// Address is TEXT -> make optional (can be empty) but allow large content.
// birthDate is DATE nullable -> optional.
export const personalDataSchema = vine.object({
    email: vine.string().email().maxLength(191),
    names: vine.string().maxLength(100),
    lastNameP: vine.string().maxLength(100),
    lastNameM: vine.string().maxLength(100),
    typeIdentifyId: vine.number().positive().optional(),
    identify: vine.string().maxLength(50).optional(),
    stateCivilId: vine.number().positive().optional(),
    sexId: vine.number().positive().optional(),
    birthDate: vine.date().optional(),
    nationalityId: vine.number().positive().optional(),
    cityId: vine.number().positive().optional(),
    address: vine.string().optional(),
    phone: vine.string().maxLength(20).optional(),
    movil: vine.string().maxLength(20).optional(),
    photo: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
})

// If we need partial updates (PATCH) with all optional fields use a derived schema:
export const personalDataPartialSchema = vine.object({
    email: vine.string().email().maxLength(191).optional(),
    names: vine.string().maxLength(100).optional(),
    lastNameP: vine.string().maxLength(100).optional(),
    lastNameM: vine.string().maxLength(100).optional(),
    typeIdentifyId: vine.number().positive().optional(),
    identify: vine.string().maxLength(50).optional(),
    stateCivilId: vine.number().positive().optional(),
    sexId: vine.number().positive().optional(),
    birthDate: vine.date().optional(),
    nationalityId: vine.number().positive().optional(),
    cityId: vine.number().positive().optional(),
    address: vine.string().optional(),
    phone: vine.string().maxLength(20).optional(),
    movil: vine.string().maxLength(20).optional(),
    photo: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
})
