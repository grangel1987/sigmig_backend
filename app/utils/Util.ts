import Env from '#start/env';
import { Request } from '@adonisjs/core/http';
import logger from '@adonisjs/core/services/logger';
import geoip from 'geoip-lite';
import { DateTime } from 'luxon';
interface LocationResult {
  country: string;
  region: string;
  city: string;
  ll: [number, number];
  timezone: string;
  offset?: string;
  postal?: string;
  metro?: string;
}

interface DateOptions {
  separator?: string;
  firstYear?: boolean;
}

export default new class Util {
  parseToMoment(
    date: DateTime,
    isDateTime = true,
    { separator = '-', firstYear = true }: DateOptions = {}
  ): string {
    const dt = date;
    if (!dt.isValid) return '';

    if (isDateTime) {
      return firstYear
        ? dt.toFormat(`yyyy${separator}MM${separator}dd HH:mm:ss`)
        : dt.toFormat(`dd${separator}MM${separator}yyyy hh:mm:ss a`);
    }
    return firstYear
      ? dt.toFormat(`yyyy${separator}MM${separator}dd`)
      : dt.toFormat(`dd${separator}MM${separator}yyyy`);
  }

  parseDateSingle(date: string | null | DateTime | Date): string {

    if (typeof date === 'string') {
      if (!date || date.length < 8) return '';
      const day = date.substring(0, 2);
      const month = date.substring(3, 5);
      const year = date.substring(6);
      return `${year}-${month}-${day}`;
    } else if (date instanceof DateTime) {
      if (!date.isValid) return '';
      return date.toFormat('yyyy-MM-dd');
    } else if (date instanceof Date) {
      return DateTime.fromJSDate(date).toFormat('yyyy-MM-dd');
    }
    return '';
  }

  parseDateFormatFriendly(
    date: DateTime,
    separator = '-',
    isDateTime = false
  ): string {
    const dt = date;
    if (!dt.isValid) return '';
    return isDateTime
      ? dt.toFormat(`dd${separator}MM${separator}yyyy hh:mm:ss a`)
      : dt.toFormat(`dd${separator}MM${separator}yyyy`);
  }

  parseDateFormatFriendlyText(date?: DateTime): string {
    if (!date) return 'N/A';
    const dt = date.setLocale('es');
    return dt.toFormat('d \'de\' MMMM \'del\' yyyy');
  }

  parseUtc(dateTime: DateTime): number {
    const expireDate = this.getDateAddDays(dateTime, 1, true);
    return Math.floor(DateTime.fromISO(expireDate).toMillis() / 1000);
  }

  async getDateTimes(req: Request) {
    // const location = await this.getLocation(ip)
    const now = DateTime.now().setZone(req.header('Timezone') || 'America/Santiago');
    return now;
  }

  formatDatetimeToString(now: DateTime<true> | DateTime<false>) {
    return now.toFormat('yyyy-MM-dd HH:mm:ss');
  }

  getDateTimesAddHours(date: DateTime, hours: number) {
    const dt = date.plus({ hours });
    return dt/* .toFormat('yyyy-MM-dd HH:mm:ss') */;
  }

  getDateAddDays(
    date: DateTime,
    days: number,
    isDateTime = false
  ): string {
    const dt = date.plus({ days });
    return isDateTime
      ? dt.toFormat('yyyy-MM-dd HH:mm:ss')
      : dt.toFormat('yyyy-MM-dd');
  }

  getDateAddMonths(
    date: DateTime,
    months: number,
    isDateTime = false
  ): string {
    const dt = date.plus({ months });
    return isDateTime
      ? dt.toFormat('yyyy-MM-dd HH:mm:ss')
      : dt.toFormat('yyyy-MM-dd');
  }

  getDateSubtractDays(
    date: DateTime,
    days: number,
    isDateTime = false
  ): string {
    const dt = date.minus({ days });
    return isDateTime
      ? dt.toFormat('yyyy-MM-dd HH:mm:ss')
      : dt.toFormat('yyyy-MM-dd');
  }

  getFirstDayOfMonth(): string {
    return DateTime.now().startOf('month').toFormat('yyyy-MM-01');
  }

  getLastDayOfMonth(): string {
    return DateTime.now().endOf('month').toFormat('yyyy-MM-dd');
  }

  getMinutesDiffDate(dateStart: DateTime): string {
    const now = DateTime.now();
    const start = dateStart;
    if (!start.isValid) return 'N/A';

    const diff = now.diff(start, ['minutes']).toObject();
    const minutes = Math.round(diff.minutes || 0);

    if (minutes === 0) return 'Ahora';

    const absMinutes = Math.abs(minutes);
    if (absMinutes < 60) return `${absMinutes} min`;
    if (absMinutes <= 120) return `${Math.round(absMinutes / 60)} hora`;
    if (absMinutes <= 1440) return `${Math.round(absMinutes / 60)} horas`;
    if (absMinutes <= 2880) return `${Math.round(absMinutes / 1440)} dia`;
    if (absMinutes <= 10080) return `${Math.round(absMinutes / 1440)} dias`;
    if (absMinutes <= 525600) return `${Math.round(absMinutes / 10080)} sem`;
    if (absMinutes <= 1051200) return `${Math.round(absMinutes / 525600)} año`;
    return '+ 2 años';
  }

  getStatusExpireFriendly(dateStart: DateTime): string {
    const now = DateTime.now();
    const start = dateStart;
    if (!start.isValid) return 'N/A';

    const days = Math.round(now.diff(start, 'days').days);

    if (now.hasSame(start, 'day')) return 'Vence hoy';
    if (start > now) return `Vence en (${days}) dias`;
    return `Vencido desde ${this.parseDateFormatFriendly(start)}`;
  }

  async getLocation(ip?: string): Promise<LocationResult | null> {
    try {
      const nodeEnv = Env.get('NODE_ENV');
      const lookupIp = nodeEnv === 'development' ? '83.110.250.231' : ip;

      if (!lookupIp) {
        logger.warn('No IP provided for location lookup');
        return null;
      }

      const geoipResult = geoip.lookup(lookupIp);
      if (!geoipResult) {
        logger.warn(`No geoip data found for IP: ${lookupIp}`);
        return null;
      }

      return {
        country: geoipResult.country || '',
        region: geoipResult.region || '',
        city: geoipResult.city || '',
        ll: geoipResult.ll || [0, 0],
        timezone: geoipResult.timezone || 'America/Santiago',
      };
    } catch (error) {
      logger.error(`GeoIP lookup failed for IP ${ip}: ${error}`);
      return null;
    }
  }

  async getTimeZone(ip?: string) {
    const location = await this.getLocation(ip);
    return location?.timezone || 'America/Santiago';
  }

  getCode() {
    return Math.round(Math.random() * 999999).toString();
  }

  /**
   * Truncate a number to 2 decimal places without rounding
   * @param value - The number to truncate
   * @returns The truncated number with 2 decimal places
   */
  truncateToTwoDecimals(value: number | null): number | null {
    if (value === null || value === undefined) return null;
    return Math.trunc(value * 100) / 100;
  }

}

