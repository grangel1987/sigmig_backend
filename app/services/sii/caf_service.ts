import SiiCafFile from '#models/sii/sii_caf_file'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

interface UploadCafPayload {
    businessId: number
    dteType: number
    rangeStart: number
    rangeEnd: number
    issuedAt?: string | null
    encryptedPrivateKeyRef?: string | null
    rawCafXml?: string | null
    activate?: boolean
}

interface AllocateFolioResult {
    cafId: number
    businessId: number
    dteType: number
    folio: number
    rangeEnd: number
    remainingFolios: number
}

export default class CafService {
    public static async upload(payload: UploadCafPayload) {
        if (payload.rangeStart <= 0 || payload.rangeEnd <= 0 || payload.rangeStart > payload.rangeEnd) {
            throw new Error('Invalid CAF folio range')
        }

        const activate = payload.activate ?? true
        const trx = await db.transaction()

        try {
            if (activate) {
                await SiiCafFile.query({ client: trx })
                    .where('business_id', payload.businessId)
                    .where('dte_type', payload.dteType)
                    .where('active', true)
                    .update({ active: false })
            }

            const caf = await SiiCafFile.create(
                {
                    businessId: payload.businessId,
                    dteType: payload.dteType,
                    rangeStart: payload.rangeStart,
                    rangeEnd: payload.rangeEnd,
                    nextFolio: payload.rangeStart,
                    issuedAt: payload.issuedAt ? DateTime.fromISO(payload.issuedAt) : null,
                    encryptedPrivateKeyRef: payload.encryptedPrivateKeyRef ?? null,
                    rawCafXml: payload.rawCafXml ?? null,
                    active: activate,
                },
                { client: trx }
            )

            await trx.commit()
            return caf
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    public static async getActive(businessId: number, dteType: number) {
        return SiiCafFile.query()
            .where('business_id', businessId)
            .where('dte_type', dteType)
            .where('active', true)
            .whereRaw('next_folio <= range_end')
            .orderBy('id', 'desc')
            .first()
    }

    public static async allocateNextFolio(businessId: number, dteType: number): Promise<AllocateFolioResult> {
        const trx = await db.transaction()

        try {
            const caf = await SiiCafFile.query({ client: trx })
                .where('business_id', businessId)
                .where('dte_type', dteType)
                .where('active', true)
                .whereRaw('next_folio <= range_end')
                .orderBy('id', 'desc')
                .forUpdate()
                .first()

            if (!caf) {
                throw new Error('No active CAF with available folios')
            }

            const folio = Number(caf.nextFolio)
            const nextFolio = folio + 1

            caf.nextFolio = nextFolio
            if (nextFolio > Number(caf.rangeEnd)) {
                caf.active = false
            }
            await caf.save()

            await trx.commit()

            return {
                cafId: caf.id,
                businessId,
                dteType,
                folio,
                rangeEnd: Number(caf.rangeEnd),
                remainingFolios: Math.max(Number(caf.rangeEnd) - folio, 0),
            }
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }
}
