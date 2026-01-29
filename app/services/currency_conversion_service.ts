import Indicator from '#models/settings/indicator'
import { DateTime } from 'luxon'

/**
 * Service for converting currency amounts using indicator exchange rates
 * 
 * Indicators provide exchange rates to/from CLP (Chilean Pesos):
 * - dolar: USD to CLP rate
 * - euro: EUR to CLP rate
 * - uf: UF to CLP rate
 * - utm: UTM to CLP rate
 * 
 * Supported currency IDs (assuming common conventions):
 * - 1: CLP (Chilean Peso) - base currency
 * - 2: USD (US Dollar)
 * - 3: EUR (Euro)
 * - 4: UF (Unidad de Fomento)
 * - 5: UTM (Unidad Tributaria Mensual)
 */
export default class CurrencyConversionService {
    /**
     * Currency ID to indicator field mapping
     */
    private static readonly CURRENCY_TO_INDICATOR_FIELD: Record<number, string> = {
        2: 'dolar',   // USD
        3: 'euro',    // EUR
        4: 'uf',      // UF
        5: 'utm',     // UTM
    }

    /**
     * Get the appropriate indicator for a given date
     * Falls back to the latest indicator if no exact match
     */
    private static async getIndicatorForDate(date: DateTime): Promise<Indicator | null> {
        const dateStr = date.toSQLDate()!

        // Try to find indicator for the exact date
        let indicator = await Indicator.query()
            .whereRaw('DATE(date) = ?', [dateStr])
            .orderBy('id', 'desc')
            .first()

        // If not found, get the most recent indicator before or on that date
        if (!indicator) {
            indicator = await Indicator.query()
                .whereRaw('DATE(date) <= ?', [dateStr])
                .orderBy('date', 'desc')
                .first()
        }

        // If still not found, get the latest indicator available
        if (!indicator) {
            indicator = await Indicator.query()
                .orderBy('date', 'desc')
                .first()
        }

        return indicator
    }

    /**
     * Convert an amount from one currency to another using indicator rates
     * Both currencies must be supported (CLP, USD, EUR, UF, UTM)
     * 
     * @param amount - The amount to convert
     * @param fromCurrencyId - Source currency ID
     * @param toCurrencyId - Target currency ID
     * @param date - Date to use for indicator lookup
     * @returns Converted amount, or null if conversion not possible
     */
    public static async convertAmount(
        amount: number,
        fromCurrencyId: number,
        toCurrencyId: number,
        date: DateTime
    ): Promise<number | null> {
        // If same currency, no conversion needed
        if (fromCurrencyId === toCurrencyId) {
            return amount
        }

        const indicator = await this.getIndicatorForDate(date)
        if (!indicator) {
            return null
        }

        // CLP is the base currency (ID 1)
        const CLP_ID = 1

        // Convert from source currency to CLP
        let amountInClp = amount
        if (fromCurrencyId !== CLP_ID) {
            const field = this.CURRENCY_TO_INDICATOR_FIELD[fromCurrencyId]
            if (!field) {
                return null // Unsupported source currency
            }
            const rate = (indicator as any)[field]
            if (!rate || rate <= 0) {
                return null
            }
            amountInClp = amount * rate
        }

        // Convert from CLP to target currency
        let result = amountInClp
        if (toCurrencyId !== CLP_ID) {
            const field = this.CURRENCY_TO_INDICATOR_FIELD[toCurrencyId]
            if (!field) {
                return null // Unsupported target currency
            }
            const rate = (indicator as any)[field]
            if (!rate || rate <= 0) {
                return null
            }
            result = amountInClp / rate
        }

        return result
    }

    /**
     * Check if a currency is supported for conversion
     */
    public static isCurrencySupported(currencyId: number): boolean {
        // 1 is CLP (always supported as base)
        // Others are supported if in the mapping
        return currencyId === 1 || currencyId in this.CURRENCY_TO_INDICATOR_FIELD
    }
}
