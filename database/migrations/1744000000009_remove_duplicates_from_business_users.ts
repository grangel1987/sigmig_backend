import { BaseSchema } from '@adonisjs/lucid/schema'
import db from '@adonisjs/lucid/services/db'

export default class RemoveDuplicatesFromBusinessUsers extends BaseSchema {
  async up() {
    // Remove duplicate entries from business_users table
    // Keep only the record with the highest id for each business_id + user_id combination
    await db.rawQuery(`
      DELETE FROM business_users 
      WHERE id NOT IN (
        SELECT MAX(id) 
        FROM (SELECT * FROM business_users) AS temp 
        GROUP BY business_id, user_id
      )
    `)
  }

  async down() {
    // Down migration is a no-op since we can't restore deleted duplicates
    console.warn('Down migration for removing duplicates is a no-op - deleted data cannot be restored')
  }
}