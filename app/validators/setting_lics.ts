import vine from '@vinejs/vine'

// Generic name-based validators for Setting Lic entities
const nameRequired = vine.string().trim()
const nameOptional = vine.string().trim().optional()

// Type License
export const licTypeLicenseStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licTypeLicenseUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)

// Mutual
export const licMutualStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licMutualUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)

// Occupation
export const licOccupationStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licOccupationUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)

// Paying Entity
export const licPayingEntityStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licPayingEntityUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)

// Compensation Box
export const licCompensationBoxStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licCompensationBoxUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)

// Work Activity
export const licWorkActivityStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licWorkActivityUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)

// Motive
export const licMotiveStoreValidator = vine.compile(
    vine.object({
        name: nameRequired,
    })
)
export const licMotiveUpdateValidator = vine.compile(
    vine.object({
        name: nameOptional,
    })
)
