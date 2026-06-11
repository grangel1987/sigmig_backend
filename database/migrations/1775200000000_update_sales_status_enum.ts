import { BaseSchema } from '@adonisjs/lucid/schema'

export default class UpdateSalesStatusEnumSchema extends BaseSchema {
    protected tableName = 'sales'

    public async up() {
        const db = this.db
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            return
        }

        await db.rawQuery(
            `ALTER TABLE ${this.tableName}
       MODIFY COLUMN status ENUM(
         'draft',
         'pending',
         'confirmed',
         'canceled',
         'paid',
         'unpaid',
         'payment_pending',
         'voided',
         'rejected'
       ) NOT NULL DEFAULT 'unpaid'`
        )

        await db.rawQuery(
            `UPDATE sales
       SET status = CASE status
         WHEN 'draft' THEN 'unpaid'
         WHEN 'pending' THEN 'payment_pending'
         WHEN 'confirmed' THEN 'paid'
         WHEN 'canceled' THEN 'voided'
         ELSE status
       END`
        )

        await db.rawQuery(
            `ALTER TABLE ${this.tableName}
       MODIFY COLUMN status ENUM(
         'paid',
         'unpaid',
         'payment_pending',
         'voided',
         'rejected'
       ) NOT NULL DEFAULT 'unpaid'`
        )
    }

    public async down() {
        const db = this.db
        const tableExists = await this.schema.hasTable(this.tableName)

        if (!tableExists) {
            return
        }

        await db.rawQuery(
            `ALTER TABLE ${this.tableName}
       MODIFY COLUMN status ENUM(
         'draft',
         'pending',
         'confirmed',
         'canceled',
         'paid',
         'unpaid',
         'payment_pending',
         'voided',
         'rejected'
       ) NOT NULL DEFAULT 'draft'`
        )

        await db.rawQuery(
            `UPDATE sales
       SET status = CASE status
         WHEN 'unpaid' THEN 'draft'
         WHEN 'payment_pending' THEN 'pending'
         WHEN 'paid' THEN 'confirmed'
         WHEN 'voided' THEN 'canceled'
         WHEN 'rejected' THEN 'canceled'
         ELSE status
       END`
        )

        await db.rawQuery(
            `ALTER TABLE ${this.tableName}
       MODIFY COLUMN status ENUM(
         'draft',
         'pending',
         'confirmed',
         'canceled'
       ) NOT NULL DEFAULT 'draft'`
        )
    }
}