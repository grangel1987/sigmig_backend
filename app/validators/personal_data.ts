import vine from '@vinejs/vine'

// Shared personalData schema used in users, employees, providers.
// All core identity fields required; email/phone/photo optional.
// birthDate expects a date type (will be converted in controllers with DateTime.fromJSDate).
export const personalDataSchema = vine.object({
    email: vine.string().email().optional(),
    names: vine.string(),
    lastNameP: vine.string(),
    lastNameM: vine.string(),
    typeIdentifyId: vine.number().positive(),
    identify: vine.string(),
    stateCivilId: vine.number().min(0),
    sexId: vine.number().positive(),
    birthDate: vine.date(),
    nationalityId: vine.number().positive(),
    cityId: vine.number().positive(),
    address: vine.string(),
    phone: vine.string().optional(),
    movil: vine.string(),
    photo: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }).optional(),
})
