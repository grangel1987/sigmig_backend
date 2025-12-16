import Indicator from "#models/settings/indicator"
import SettingRepository from "#repositories/settings/setting_repository"
import PermissionService from '#services/permission_service'
import MessageFrontEnd from "#utils/MessageFrontEnd"
import Util from "#utils/Util"
import { countryIdParamValidator } from '#validators/settings'
import { HttpContext } from "@adonisjs/core/http"
import logger from "@adonisjs/core/services/logger"
import ky from 'ky'
import { DateTime } from "luxon"
interface IndicatorPayload {
  uf: number
  utm: number
  dolar: number
  euro: number
  date: DateTime
}

export default class SettingController {
  // Fetch settings by country
  public async findSettingsByCountry(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'settings', 'view');

    const { params, response, i18n } = ctx
    try {
      const { id } = await countryIdParamValidator.validate(params)
      const settings = await SettingRepository.findSettingsByCountry(id)
      return settings
    } catch (error: any) {
      return response.status(400).json({
        ...MessageFrontEnd(
          error?.message || i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        )
      })
    }
  }

  // Fetch or update economic indicators
  public async indicators(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'settings', 'view');

    const { request, i18n } = ctx
    try {
      const dateTime = await Util.getDateTimes(request)
      const lastIndicator = await SettingRepository.getLastIndicator()

      if (lastIndicator) {
        const lastDate = lastIndicator.date
        const currentDateStr = dateTime.toFormat('yyyy-MM-dd')
        const lastDateStr = lastDate.toFormat('yyyy-MM-dd')

        if (currentDateStr === lastDateStr) {
          return {
            uf: lastIndicator.uf,
            utm: lastIndicator.utm,
            dolar: lastIndicator.dolar,
            euro: lastIndicator.euro,
          }
        }
      }

      // Fetch new indicators from API
      const response = await ky.get('https://mindicador.cl/api').json<{
        uf: { valor: number }
        utm: { valor: number }
        dolar: { valor: number }
        euro: { valor: number }
      }>()


      const payload: IndicatorPayload = {
        uf: response.uf.valor,
        utm: response.utm.valor,
        dolar: response.dolar.valor,
        euro: response.euro.valor,
        date: dateTime,
      }

      // Insert into indicators table
      await Indicator.create(payload)

      return payload
    } catch (error) {

      console.log(error);

      logger.error('indicators: Error', { error: error.message })
      return {
        error: MessageFrontEnd(
          i18n.formatMessage('messages.error_fetching_indicators'),
          i18n.formatMessage('messages.error_title')
        ),
      }
    }
  }
}
