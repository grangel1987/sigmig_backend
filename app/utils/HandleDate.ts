import { DateTime } from "luxon";

/**
 * 
 * @param date Date parameter as Luxon DateTime or JS Date instance, or string strictly formatted as ISO8061.
 * @returns 
 */
export default function handleDate(date: string | Date | DateTime): DateTime {
    if (date instanceof DateTime) return date
    if (date instanceof Date) return DateTime.fromJSDate(date)
    return DateTime.fromISO(date)
}