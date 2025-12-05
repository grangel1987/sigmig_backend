import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * Normalize users signature_short and signature_thumb_short values:
 * - If signature_short is a full URL and signature is NULL, move it to signature
 * - If signature_thumb_short is a full URL and signature_thumb is NULL, move it to signature_thumb
 * - Then strip scheme/host/bucket from *_short fields, keeping only the path
 */
export default class FixUsersSignatureShortNormalization extends BaseSchema {
    public async up() {
        const trx = await db.transaction()
        try {
            // Move full URL to signature when missing
            await trx.rawQuery(
                `UPDATE users
         SET signature = signature_short
         WHERE signature IS NULL
           AND signature_short REGEXP '^https?://'`
            )

            // Move full URL to signature_thumb when missing
            await trx.rawQuery(
                `UPDATE users
         SET signature_thumb = signature_thumb_short
         WHERE signature_thumb IS NULL
           AND signature_thumb_short REGEXP '^https?://'`
            )

            // Normalize signature_short to path-only
            await trx.rawQuery(
                `UPDATE users
         SET signature_short = REGEXP_REPLACE(signature_short, '^https?://[^/]+/[^/]+/', '')
         WHERE signature_short REGEXP '^https?://'`
            )

            // Normalize signature_thumb_short to path-only
            await trx.rawQuery(
                `UPDATE users
         SET signature_thumb_short = REGEXP_REPLACE(signature_thumb_short, '^https?://[^/]+/[^/]+/', '')
         WHERE signature_thumb_short REGEXP '^https?://'`
            )

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    public async down() {
        // No-op: do not attempt to reconstruct original URLs
    }
}
