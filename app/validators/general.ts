import vine from "@vinejs/vine";

export const indexFiltersWithStatus = vine.compile(
    vine.object({
        page: vine.number().positive().optional(),
        perPage: vine.number().positive().optional(),
        text: vine.string().trim().optional(),
        status: vine.enum(['enabled', 'disabled'] as const).optional(),
    })
)