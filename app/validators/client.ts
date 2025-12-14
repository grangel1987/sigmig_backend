import vine from '@vinejs/vine'

/**
 * Client validators converted from legacy (Clients/Store, StoreWEB, Update)
 * Field names follow the current codebase camelCase convention.
 */

export const clientStoreValidator = vine.compile(
  vine.object({
    identifyTypeId: vine.number().positive(),
    identify: vine.string().trim().maxLength(50),
    name: vine.string().trim().maxLength(255),
    phone: vine.string().trim(),
    email: vine.string().trim().email(),
    giro: vine.string().trim().maxLength(255).optional(),
    address: vine.string().trim().maxLength(255),
    typeId: vine.number().positive(),
    cityId: vine.number().positive(),
    clientDocumentInvoiceId: vine.number().positive().optional().requiredWhen('typeId', '=', 2),
    clientDocumentInvoiceValue: vine
      .string()
      .trim()
      .maxLength(250)
      .optional()
      .requiredWhen('typeId', '=', 2),
    systemPaymentProvider: vine
      .string()
      .trim()
      .maxLength(250)
      .optional()
      .requiredWhen('typeId', '=', 2),
    responsibles: vine
      .array(
        vine.object({
          name: vine.string().trim().maxLength(255),
          phone: vine.string().trim().maxLength(255),
          email: vine.string().trim().email(),
          identifyTypeId: vine.number().positive(),
          identify: vine.string().trim().maxLength(255),
          clientContactTypeId: vine.number().positive(),
        })
      )
      .optional(),
  })
)

export const clientStoreWebValidator = vine.compile(
  vine.object({
    identifyTypeId: vine.number().positive(),
    identify: vine.string().trim().maxLength(50),
    name: vine.string().trim().maxLength(255),
    phone: vine.string().trim().mobile(),
    email: vine.string().trim().email(),
    giro: vine.string().trim().maxLength(255).optional(),
    address: vine.string().trim().maxLength(255),
    typeId: vine.number().positive(),
    cityId: vine.number().positive(),
  })
)

export const clientUpdateValidator = vine.compile(
  vine.object({
    identifyTypeId: vine.number().positive().optional(),
    identify: vine.string().trim().maxLength(50).optional(),
    name: vine.string().trim().maxLength(255).optional(),
    phone: vine
      .string()
      .trim() /* .mobile() */
      .optional(),
    email: vine.string().trim().email().optional(),
    giro: vine.string().trim().maxLength(255).optional(),
    address: vine.string().trim().maxLength(255).optional(),
    typeId: vine.number().positive().optional(),
    cityId: vine.number().positive().optional(),
    clientDocumentInvoiceId: vine.number().positive().optional().requiredWhen('typeId', '=', 2),
    clientDocumentInvoiceValue: vine
      .string()
      .trim()
      .maxLength(250)
      .optional()
      .requiredWhen('typeId', '=', 2),
    systemPaymentProvider: vine
      .string()
      .trim()
      .maxLength(250)
      .optional()
      .requiredWhen('typeId', '=', 2),
    responsibles: vine
      .array(
        vine.object({
          name: vine.string().trim().maxLength(255),
          phone: vine.string().trim().maxLength(255),
          email: vine.string().trim().email(),
          identifyTypeId: vine.number().positive(),
          identify: vine.string().trim().maxLength(255),
          clientContactTypeId: vine.number().positive(),
        })
      )
      .optional(),
  })
)
