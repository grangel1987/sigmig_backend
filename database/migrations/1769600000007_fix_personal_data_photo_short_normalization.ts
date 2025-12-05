import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

/**
 * Normalize personal_data.photo_short values:
 * - If photo_short is a full URL (http/https) and photo is NULL, move it to photo
 * - Then strip scheme/host/bucket from photo_short, keeping only the path within the bucket
 */
export default class FixPersonalDataPhotoShortNormalization extends BaseSchema {
    public async up() {
        const trx = await db.transaction()
        try {
            // 1) Preserve original full URL in photo when photo is NULL and photo_short is a URL
            await trx.rawQuery(
                `UPDATE personal_data
         SET photo = photo_short
         WHERE photo IS NULL
           AND photo_short REGEXP '^https?://'`
            )

            // 2) Preserve original full URL in thumb when thumb is NULL and thumb_short is a URL
            await trx.rawQuery(
                `UPDATE personal_data
         SET thumb = thumb_short
         WHERE thumb IS NULL
           AND thumb_short REGEXP '^https?://'`
            )

            // 3) Strip protocol + host + first path segment (bucket) from photo_short, leave only object path
            await trx.rawQuery(
                `UPDATE personal_data
         SET photo_short = REGEXP_REPLACE(photo_short, '^https?://[^/]+/[^/]+/', '')
         WHERE photo_short REGEXP '^https?://'`
            )

            // 4) Strip protocol + host + first path segment (bucket) from thumb_short, leave only object path
            await trx.rawQuery(
                `UPDATE personal_data
         SET thumb_short = REGEXP_REPLACE(thumb_short, '^https?://[^/]+/[^/]+/', '')
         WHERE thumb_short REGEXP '^https?://'`
            )

            await trx.commit()
        } catch (error) {
            await trx.rollback()
            throw error
        }
    } public async down() {
        // No-op: don't attempt to rebuild original URLs once normalized
    }
}
