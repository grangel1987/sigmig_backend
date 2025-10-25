import vine from "@vinejs/vine";

export const businessValidator = vine.compile(vine.object({
    name: vine.string().trim().maxLength(255),

    country_id: vine.number().positive(),
    type_identify_id: vine.number().positive(),

    identify: vine.string().trim().maxLength(50),
    address: vine.string().trim().maxLength(255),

    phone: vine.string().trim().mobile(),
    email: vine.string().trim().email(),

    days_expire_buget: vine.number().min(1).max(365),
    coins: vine.any().optional(),

    del_name: vine.any().optional(),
    del_type_identify_id: vine.any().optional(),
    del_identify: vine.any().optional(),
    del_phone: vine.any().optional(),
    del_email: vine.any().optional(),

    authorization_minor: vine.any().optional(),
    email_confirm_inactive_employee: vine.any().optional(),
}))