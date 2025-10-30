import vine from "@vinejs/vine";

export const businessValidator = vine.compile(vine.object({
    name: vine.string().trim().maxLength(255),

    countryId: vine.number().positive(),
    typeIdentifyId: vine.number().positive(),

    identify: vine.string().trim().maxLength(50),
    address: vine.string().trim().maxLength(255),

    phone: vine.string().trim().mobile(),
    email: vine.string().trim().email(),

    daysExpireBuget: vine.number().min(1).max(365),
    coins: vine.any().optional(),

    delName: vine.any().optional(),
    delTypeIdentifyId: vine.any().optional(),
    delIdentify: vine.any().optional(),
    delPhone: vine.any().optional(),
    delEmail: vine.any().optional(),

    authorizationMinor: vine.any().optional(),
    emailConfirmInactiveEmployee: vine.any().optional(),
}))