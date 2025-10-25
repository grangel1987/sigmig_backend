import BusinessUser from '#models/business/business_user'
import User from '#models/users/user'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { HttpContext, Response } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import UserRepository from '../../repositories/users/user_repository.js'

interface BusinessPayload {
  business_id: number
  rol_id: number
  permissions: number[]
}

interface PersonalDataPayload {
  names: string
  last_name_p: string
  last_name_m: string
  type_identify_id: number
  identify: string
}

export default class UserController {
  public async login({ request, response, auth, i18n }: HttpContext) {
    const { username, password } = request.only(['username', 'password'])
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const user = await UserRepository.findByEmail(username)
      if (!user) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (!user.verified) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_no_verified'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }


      if (!(await user.verifyPassword(password))) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.error_login'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const accessToken = await auth.use('jwt').generate(user)
      const refreshToken = await User.refreshTokens.create(user)

      if (accessToken instanceof Response) return accessToken

      await UserRepository.addInfoLocation(dateTime, request.ip(), user.id)


      await db.table('tokens').insert({
        user_id: user.id,
        token: accessToken.token,
        type: 'bearer',
        is_revoked: 0,
        created_at: dateTime.toSQL(),
        updated_at: dateTime.toSQL(),
        refreshToken: refreshToken.toJSON().token,
      })

      await UserRepository.addInfoLocation(dateTime, request.ip(), user.id)
      await UserRepository.updateToken(accessToken.token, user.id)
      await UserRepository.revokeOtherTokensOwner(accessToken.token, user.id)
      const userData = await UserRepository.findDataCompleteUserByUserId(user.id)


      return response.status(200).json({
        accessToken,
        refreshToken: refreshToken.toJSON().token,
        userData,
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_login'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async refresh({ response, auth, i18n }: HttpContext) {

    try {

      const user = await auth.use('jwt').authenticateWithRefreshToken('optional_name')
      const newRefreshToken = user.currentToken
      const newToken = await auth.use('jwt').generate(user)


      return response.status(200).json({ accessToken: newToken, newRefreshToken: newRefreshToken })
    } catch (error) {
      console.error(error)
      return response.status(401).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.invalid_token'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async changePasswordOwner({ request, response, auth, i18n }: HttpContext) {
    const { current_password, new_password } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await auth.use('jwt').authenticate()

    if (await user.verifyPassword(current_password)) {
      try {
        user.password = new_password
        user.updated_at = dateTime
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } catch (error) {
        console.error(error)
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.current_password_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async resetPassword({ request, response, auth, i18n }: HttpContext) {
    const dateTime = await Util.getDateTimes(request.ip())
    const { business_id, user_id } = request.all()
    const user = await auth.use('jwt').authenticate()

    const businessUser = await BusinessUser.query()
      .where('business_id', business_id)
      .where('user_id', user.id)
      .preload('businessUserRols', (builder) => {
        builder.where('rol_id', 1)
      })
      .first()

    if (businessUser?.businessUserRols.length) {
      const targetUser = await User.findOrFail(user_id)
      targetUser.password = '12345678'
      targetUser.updated_at = dateTime
      await targetUser.save()
      return response.status(201).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } else {
      return response.status(403).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_permission'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async forgotPassword({ request, response, i18n }: HttpContext) {
    const { email, /* methodSendCode */ } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const user = await User.query()
        .where('email', email)
        .where('enabled', true)
        .where('verified', true)
        .preload('personalData', (builder) => {
          builder.select(['id', 'names', 'last_name_p', 'last_name_m'])
        })
        .first()

      if (user) {
        user.code = Util.getCode().toString()
        user.code_date_time = Util.getDateTimesAddHours(dateTime, 1)
        await user.save()

        /*         const full_name = user.personalData
                  ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
                  : 'Sin Nombre'
        
                const userNotification = {
                  title: 'Recuperación de contraseña',
                  body: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Utiliza el siguiente código de verificación para completar el proceso:',
                  time: user.code_date_time,
                  email: user.email,
                  full_name,
                  code: user.code,
                }
        
                if (methodSendCode === 'email') {
                  emitter.emit('new::userForgotPasswordStore', userNotification)
                } else if (methodSendCode === 'whatsapp') {
                  // Implement WhatsApp sending logic
                } */

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.codeSend_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_find_user_by_email'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async changePasswordForgot({ request, response, i18n }: HttpContext) {
    const { email, code, new_password } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())

    const user = await User.query()
      .where('email', email)
      .where('code', code)
      .where('enabled', true)
      .where('verified', true)
      .first()

    if (user) {
      if (Util.parseToMoment(user.code_date_time!) >= dateTime.toISO()!) {
        try {
          user.password = new_password
          user.code = null
          user.code_date_time = null
          user.updated_at = dateTime
          await user.save()

          return response.status(201).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.update_ok'),
              i18n.formatMessage('messages.ok_title')
            ),
          })
        } catch (error) {
          return response.status(500).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.update_error'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.code_expired'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.code_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async assignUserToEmployee({ request, response, i18n }: HttpContext) {
    const { personal_data_id, email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const password = '12345678'

    try {
      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const existingPersonalData = await User.findBy('personal_data_id', personal_data_id)
      if (existingPersonalData) {
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existPersonalData'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const user = await User.create({
        email,
        password,
        personal_data_id,
        created_at: dateTime,
        updated_at: dateTime,
        enabled: true,
      })

      await user.load('personalData', (builder) => {
        builder.select(['id', 'names', 'last_name_p', 'last_name_m'])
      })

      /* 
      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
        : 'Sin Nombre'

            emitter.emit('new::userAssignedToEmployee', {
              title: 'Asignacion de usuario a empleado',
              body: 'Se ha realizado la asignacion de usuario a empleado, a continuacion usa el siguiente codigo para verificar tu usuario.',
              time: user.code_date_time,
              email,
              code: user.code,
              full_name,
            }) */

      return response.status(201).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async removeUserFromEmployee({ request, response, i18n }: HttpContext) {
    const { user_id } = request.all()

    try {
      const user = await User.find(user_id)
      if (user) {
        user.enabled = false
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.delete_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.delete_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async store({ request, response, auth, i18n }: HttpContext) {
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const { email, business, personal_data_id, personal_data } = request.all() as {
        email: string
        business: string | BusinessPayload[]
        personal_data_id?: number
        personal_data?: string | PersonalDataPayload
      }
      const signature = request.file('signature')
      const businessArray: BusinessPayload[] = typeof business === 'string' ? JSON.parse(business) : business

      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        await trx.rollback()
        return response.status(400).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const user = await User.create(
        {
          email,
          password: '12345678',
          created_at: dateTime,
          updated_at: dateTime,
          enabled: true,
        },
        { client: trx }
      )

      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signature_short = resultUpload.url_short
        user.signature_thumb = resultUpload.url_thumb
        user.signature_thumb_short = resultUpload.url_thumb_short
        await user.useTransaction(trx).save()
      }

      for (const bus of businessArray) {
        const payloadBusinessUser = {
          user_id: user.id,
          business_id: bus.business_id,
        }

        const businessUser = await user.related('businessUser').create(payloadBusinessUser, { client: trx })

        const businessUserRol = {
          business_user_id: businessUser.id,
          rol_id: bus.rol_id,
        }

        await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

        const payloadPermission = bus.permissions.map((permId) => ({
          business_user_id: businessUser.id,
          permission_id: permId,
        }))

        await businessUser.related('bussinessUserPermissions').createMany(payloadPermission, { client: trx })
      }

      if (personal_data_id) {
        user.personal_data_id = personal_data_id
      } else {
        const parsedPersonalData =
          typeof personal_data === 'string' ? JSON.parse(personal_data) : personal_data
        parsedPersonalData.created_at = dateTime
        parsedPersonalData.updated_at = dateTime
        parsedPersonalData.created_by = auth.user!.id
        parsedPersonalData.updated_by = auth.user!.id

        const personalData = await user.related('personalData').create(parsedPersonalData, { client: trx })
        user.personal_data_id = personalData.id
        await user.useTransaction(trx).save()
      }

      await trx.commit()

      /*      const full_name = user.personalData
             ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
             : 'Sin Nombre'
     
           emitter.emit('new::userAssignedToEmployee', {
             title: 'Registro de usuario',
             body: 'Se ha realizado el registro de usuario exitosamente, a continuacion usa el siguiente codigo para verificar tu usuario.',
             time: user.code_date_time,
             email,
             code: user.code,
             full_name,
           })
      */
      return response.status(201).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async verifiedUser({ request, response, i18n }: HttpContext) {
    const { email, code } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (!user) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_exist'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    if (user.verified) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.user_already_verified'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    if (user.code === code && Util.parseToMoment(user.code_date_time!) >= dateTime.toISO()!) {
      user.verified = true
      await user.save()
      return response.status(201).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.user_verified'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage(user.code === code ? 'messages.code_expired' : 'messages.code_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async findByArgs({ request }: HttpContext) {
    const { args } = request.all()
    const users = await UserRepository.findByArgs(args)
    return users
  }

  public async findByToken({ auth }: HttpContext) {
    const userId = auth.user!.id
    const userData = await UserRepository.findDataCompleteUserByUserId(userId)
    return userData
  }

  public async webRegisterEmail({ request, response, i18n }: HttpContext) {
    const { email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())

    try {
      const user = await User.findBy('email', email)
      if (user) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const payload = {
        email,
        created_at: dateTime,
        updated_at: dateTime,
        client_id: -1,
        is_admin: false,
        in_app: false,
        employee_id: 0,
      }

      const newUser = await User.create(payload)
      newUser
      /*   emitter.emit('new::userEmailStore', {
          email: newUser.email,
          code_confirm: newUser.code,
        }) */

      return response.status(201).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.codeSend_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_find_user_by_email'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webVerifyCodeConfirm({ request, response, i18n }: HttpContext) {
    const { code, email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (user) {
      if (user.code === code && Util.parseToMoment(user.code_date_time!) >= dateTime.toISO()!) {
        user.verified = true
        user.verified_at = dateTime
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.code_verify'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } else {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage(user.code === code ? 'messages.code_expired' : 'messages.code_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    } else {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_exist'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webRegisterPwd({ request, response, i18n }: HttpContext) {
    const { password, email } = request.all()
    const dateTime = await Util.getDateTimes(request.ip())
    const user = await User.findBy('email', email)

    if (user) {
      try {
        user.password = password
        user.updated_at = dateTime
        await user.save()

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.update_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
        })
      } catch (error) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.store_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
    }
  }

  public async webClientLogin({ request, response, auth, i18n }: HttpContext) {
    const dateTime = await Util.getDateTimes(request.ip())
    const { username, password } = request.only(['username', 'password'])

    try {
      const user = await UserRepository.findByEmail(username)
      if (!user) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (!user.verified) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_no_verified'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (user.client_id <= 0 && user.client_id !== -1) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_error'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      if (!(await user.verifyPassword(password))) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.error_login'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const token = await auth.use('jwt').generate(user)
      user.last_login_at = dateTime
      user.last_login_tz = await Util.getTimeZone(request.ip())
      await user.save()

      return response.status(200).json({
        ...token,
        user,
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_login'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webClientShow({ auth }: HttpContext) {
    const user = await auth.use('jwt').authenticate()
    return user
  }

  public async webClientLogout({ auth }: HttpContext) {
    // Revoke refresh tokens if needed
    await db.from('refresh_tokens').where('user_id', auth.user!.id).delete()
    return null
  }
}