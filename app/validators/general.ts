import vine from "@vinejs/vine";

export const searchWithStatusSchema = vine.object({
    page: vine.number().positive().optional(),
    perPage: vine.number().positive().optional(),
    text: vine.string().trim().optional(),
    startDate: vine.date().optional(),
    endDate: vine.date().optional(),
    date: vine.date().optional(),
    status: vine.enum(['enabled', 'disabled'] as const).optional(),
    roleId: vine.number().positive().optional(),
    budgetStatus: vine.enum(['pending', 'revision', 'reject', 'accept'] as const).optional(),
    businessId: vine.number().positive().optional(),
});
export const indexFiltersWithStatus = vine.compile(
    searchWithStatusSchema
)