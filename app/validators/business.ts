import vine from "@vinejs/vine";

export const businessValidator = vine.compile(vine.object({
    name: vine.string().trim().maxLength(255),

    countryId: vine.number().positive(),
    typeIdentifyId: vine.number().positive(),

    identify: vine.string().trim().maxLength(50),
    address: vine.string().trim().maxLength(255),

    phone: vine.string().trim(),
    email: vine.string().trim(),

    daysExpireBuget: vine.number().min(1).max(365),
    coins: vine.array(vine.number().positive()).optional(),

    delegateName: vine.string().optional(),
    delegateTypeIdentifyId: vine.number().optional(),
    delegateIdentify: vine.string().optional(),
    delegatePhone: vine.string().optional(),
    delegateEmail: vine.string().optional(),

    authorizationMinor: vine.boolean().optional(),
    emailConfirmInactiveEmployee: vine.boolean().optional(),
}))