import Business from '#models/business/business'
import BusinessUser from '#models/business/business_user'
import Employee from '#models/employees/employee'
import Module from '#models/module'
import Permission from '#models/permissions/permission'
import PersonalData from '#models/users/personal_data'
import User from '#models/users/user'
import PermissionService from '#services/permission_service'
import env from '#start/env'
import { Google } from '#utils/Google'
import MessageFrontEnd from '#utils/MessageFrontEnd'
import Util from '#utils/Util'
import { indexFiltersWithStatus } from '#validators/general'
import { personalDataPartialSchema, personalDataSchema } from '#validators/personal_data'
import { HttpContext, Response } from '@adonisjs/core/http'
import emitter from '@adonisjs/core/services/emitter'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import mail from '@adonisjs/mail/services/main'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import { log } from 'node:console'
import crypto from 'node:crypto'
import UserRepository from '../../repositories/users/user_repository.js'

interface BusinessPayload {
  businessId: number
  rolId?: number
  permissions?: number[]
  isSuper?: boolean
  isAuthorizer?: boolean
}

// PersonalData payload validated inline in handlers to match the model

const SUPERUSER_ROLE_CURRENT_ID = 1
export default class UserController {
  public async login({ request, response, auth, i18n }: HttpContext) {
    const { email, password } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string(),
          password: vine.string(),
        })
      )
    )

    const dateTime = await Util.getDateTimes(request)

    try {
      const user = await UserRepository.findByEmail(email)

      // log(user)
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

      const pass = user.password
      let passVerify = false
      const isBcrypt = pass.startsWith('$2a$10$')
      if (isBcrypt) {
        passVerify = await hash.use('bcrypt').verify(pass, password)
      } else passVerify = await user.verifyPassword(password)

      console.log({ passVerify, isBcrypt })

      if (!passVerify) {
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

      /* 
            const sqlDate = dateTime.toSQL({ includeOffset: false })
            await db.table('tokens').insert({
              user_id: user.id,
              token: accessToken.token,
              type: 'bearer',
              is_revoked: 0,
              created_at: sqlDate,
              updated_at: sqlDate,
              refreshToken: refreshToken.toJSON().token,
            })
            await UserRepository.updateToken(accessToken.token, user.id)
            await UserRepository.revokeOtherTokensOwner(accessToken.token, user.id)
       */
      await UserRepository.addInfoLocation(dateTime, request.ip(), user.id)
      // const userData = await UserRepository.findDataCompleteUserByUserId(user.id) // Removed to match legacy response

      return response.status(200).json({
        accessToken,
        refreshToken: refreshToken.toJSON().token,
        // userData, // Removed to match legacy response
      })
    } catch (error) {
      console.error(error)
      if (env.get('NODE_ENV') == 'development') return response.internalServerError({ error })
      else
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

  public async findSuperusers({ request, response, i18n }: HttpContext) {
    const { params } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({
            business_id: vine.number().positive(),
          }),
        })
      )
    )
    const businessId = params.business_id

    const q = User.query()
      .preload('personalData', (q) => q.preload('typeIdentify').preload('city'))
      .preload('businessUser', (q) =>
        q
          .where('is_super', true)
          .orWhereHas('businessUserRols', (bUQ) => bUQ.where('id', SUPERUSER_ROLE_CURRENT_ID))
          .where('business_id', businessId)
      )
      .whereHas('businessUser', (q) =>
        q
          .where('is_super', true)
          .orWhereHas('businessUserRols', (bUQ) => bUQ.where('id', SUPERUSER_ROLE_CURRENT_ID))
          .where('business_id', businessId)
      )
      .orWhere('is_admin', true)
    const businessUsers = await q

    const res = businessUsers.map((bu) => {
      const serialized = { ...bu.serialize() } as Record<string, any>
      delete serialized.user
      return serialized
    })

    response.ok(res)
    try {
    } catch (error) {
      console.error(error)
      return response.status(401).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async changePasswordOwner({ request, response, auth, i18n }: HttpContext) {
    const { currentPassword, newPassword } = await request.validateUsing(
      vine.compile(
        vine.object({
          currentPassword: vine.string().minLength(1),
          newPassword: vine.string().minLength(8),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request)
    const user = await auth.use('jwt').authenticate()

    if (await user.verifyPassword(currentPassword)) {
      try {
        user.password = newPassword
        user.updatedAt = dateTime
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
    const dateTime = await Util.getDateTimes(request)
    const { businessId, userId } = await request.validateUsing(
      vine.compile(
        vine.object({
          businessId: vine.number().positive(),
          userId: vine.number().positive(),
        })
      )
    )
    const user = await auth.use('jwt').authenticate()

    const businessUser = await BusinessUser.query()
      .where('business_id', businessId)
      .where('user_id', user.id)
      .preload('businessUserRols', (builder) => {
        builder.where('rol_id', 1)
      })
      .first()

    if (businessUser?.businessUserRols.length) {
      const targetUser = await User.findOrFail(userId)
      targetUser.password = '12345678'
      targetUser.updatedAt = dateTime
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
    const { email /* methodSendCode */ } = request.all()

    try {
      const user = await User.query()
        .where('email', email)
        .where('enabled', true)
        .where('verified', true)
        .preload('personalData', (builder) => {
          builder.preload('typeIdentify').preload('city')
        })
        .first()

      if (user) {
        user.code = Util.getCode().toString()
        user.codeDateTime = DateTime.now().plus({ hours: 1 })
        await user.save()

        /*             const full_name = user.personalData
                          ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
                          : 'Sin Nombre'
                
                        const userNotification = {
                          title: 'Recuperación de contraseña',
                          body: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Utiliza el siguiente código de verificación para completar el proceso:',
                          time: user.codeDateTime,
                          email: user.email,
                          full_name,
                          code: user.code,
                        }
                
                        if (methodSendCode === 'email') {
                          await emitter.emit('new::userForgotPasswordStore', userNotification)
                        } else if (methodSendCode === 'whatsapp') {
                          // Implement WhatsApp sending logic
                        }  */

        try {
          await mail.send((message) => {
            message
              .to(user.email)
              .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
              .subject('SIGMI - Recuperación de Contraseña')
              .htmlView('emails/_forgot_password', {
                full_name: user.personalData?.fullName,
                code: user.code,
              })
          })
          log('Email sent successfully')
        } catch (error) {
          console.error('Failed to send email:', error)
        }

        return response.status(201).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.codeSend_ok'),
            i18n.formatMessage('messages.ok_title')
          ),
          code: user.code,
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

  public async changePasswordForgot({ request, response, i18n, auth }: HttpContext) {
    // const isDev = env.get('NODE_ENV') === 'development' || Boolean(request.header('Pwdsecret'))
    const { email, code, newPassword } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email().optional(),
          code: vine.string().trim().minLength(4),
          newPassword: vine.string().trim().minLength(8),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request)
    const dev = env.get('NODE_ENV') === 'development' || Boolean(request.header('Pwdsecret'))

    const userQ = User.query().where('enabled', true).where('verified', true)

    if (email) userQ.where('email', email)
    if (!dev) userQ.where('code', code)

    const user = auth.user || (await userQ.first())

    if (user) {
      console.log(user.serialize())

      log({ codeDateTime: user.codeDateTime?.toISO(), now: DateTime.now().toISO() })
      if (user.codeDateTime?.toISO()! >= DateTime.now().toISO()!) {
        try {
          user.password = newPassword
          user.code = null
          user.codeDateTime = null
          user.updatedAt = dateTime
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

  public async assignUserToEmployee(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'update')
    await PermissionService.requirePermission(ctx, 'employees', 'update')

    const { request, response, i18n } = ctx
    const { personalDataId, email } = request.all()
    const dateTime = await Util.getDateTimes(request)
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

      const existingPersonalData = await User.findBy('personalDataId', personalDataId)
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
        personalDataId,
        createdAt: dateTime,
        updatedAt: dateTime,
        enabled: true,
      })

      await user.load('personalData', (builder) => {
        builder.select(['id', 'names', 'last_name_p', 'last_name_m'])
        builder.preload('typeIdentify').preload('city')
      })

      /* 
      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.last_name_p} ${user.personalData.last_name_m}`
        : 'Sin Nombre'

            await emitter.emit('new::userAssignedToEmployee', {
              title: 'Asignacion de usuario a empleado',
              body: 'Se ha realizado la asignacion de usuario a empleado, a continuacion usa el siguiente codigo para verificar tu usuario.',
              time: user.codeDateTime,
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

  public async removeUserFromEmployee(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'update')

    const { request, response, i18n } = ctx
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

  public async store(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'create')

    const { request, response, auth, i18n } = ctx
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request)
    const { email, business, signature, employeeId, personalData, isAuthorizer, isAdmin } =
      await request.validateUsing(
        vine.compile(
          vine.object({
            email: vine.string().email().optional(),
            business: vine
              .array(
                vine.object({
                  businessId: vine.number().positive(),
                  rolId: vine.number().positive().optional(),
                  permissions: vine.array(vine.number().positive()).optional(),
                  isSuper: vine.boolean().optional(),
                  isAuthorizer: vine.boolean().optional(),
                })
              )
              .optional(),
            employeeId: vine
              .number()
              .positive()
              .exists({ table: 'employees', column: 'id' })
              .optional()
              .requiredIfMissing('personalData'),
            isAdmin: vine.boolean().optional(),
            isAuthorizer: vine.boolean().optional(),
            personalData: personalDataSchema.optional().requiredIfMissing('employeeId'),
            signature: vine
              .file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' })
              .optional(),
          })
        )
      )
    const createdFiles: string[] = []

    try {
      // Resolve final email from either top-level or personalData.email
      const resolvedEmail = email ?? personalData?.email
      if (!resolvedEmail) {
        await trx.rollback()
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.email_required'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
      const businessArray: BusinessPayload[] = business
        ? typeof business === 'string'
          ? JSON.parse(business)
          : business
        : []

      const existingUser = await User.findBy('email', resolvedEmail)
      if (existingUser) {
        await trx.rollback()
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      let personalDataId: number | undefined
      let employee: Employee | null = null
      if (employeeId) {
        employee = await Employee.findOrFail(employeeId)
        if (!employee.personalDataId) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.employee_missing_personal_data'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        personalDataId = employee.personalDataId
      }

      const password = Util.getCode()
      const user = await User.create(
        {
          email: resolvedEmail,
          password: password,
          personalDataId: personalDataId,
          isAdmin: isAdmin ?? false,
          isAuthorizer: isAuthorizer ?? false,
          createdAt: dateTime,
          updatedAt: dateTime,
          enabled: true,
          verified: true,
        },
        { client: trx }
      )

      await employee?.merge({ userId: user.id }).useTransaction(trx).save()
      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        await user.useTransaction(trx).save()
        createdFiles.push(resultUpload.url_short)
      }

      for (const bus of businessArray) {
        const payloadBusinessUser = {
          userId: user.id,
          businessId: bus.businessId,
          isSuper: bus.isSuper || false,
          isAuthorizer: bus.isAuthorizer ? 1 : 0,
        }

        const businessUser = await user
          .related('businessUser')
          .create(payloadBusinessUser, { client: trx })

        const businessUserRol = {
          businessUserId: businessUser.id,
          rolId: bus.rolId || 0,
        }

        await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

        // Sync notification types associated to this role to the business user
        businessUser.useTransaction(trx)
        const ntRows = await db
          .from('notification_type_rols')
          .where('rol_id', businessUserRol.rolId)
          .select('notification_type_id')
        const ntIds = ntRows.map((r: any) => Number(r.notification_type_id))
        if (ntIds.length) {
          const ntData: any = {}
          for (const ntId of ntIds) {
            ntData[ntId] = { created_at: DateTime.now().toSQL({ includeOffset: false }) }
          }
          await businessUser.related('notificationTypes').sync(ntData)
        }

        const payloadPermission = (bus.permissions || []).map((permId) => ({
          businessUserId: businessUser.id,
          permissionId: permId,
        }))

        if (payloadPermission?.length)
          await businessUser
            .related('bussinessUserPermissions')
            .createMany(payloadPermission, { client: trx })
      }

      if (!personalDataId && personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData!

        if (photo) {
          const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')

          imageData = {
            photo: resultUploadPhoto.url,
            thumb: resultUploadPhoto.url_thumb,
            photoShort: resultUploadPhoto.url_short,
            thumbShort: resultUploadPhoto.url_thumb_short,
          }
          createdFile = resultUploadPhoto.url_short
        }

        const payloadPersonalData = {
          ...rPersonalData,
          ...imageData,
          email: resolvedEmail || user.email,
          birthDate: rPersonalData.birthDate ? DateTime.fromJSDate(rPersonalData.birthDate) : null,
          phone: rPersonalData.phone ?? null,
          createdAt: dateTime,
          updatedAt: dateTime,
          createdBy: auth.user!.id,
          updatedBy: auth.user!.id,
        }

        const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
        user.personalDataId = resPersonalData.id
        if (createdFile) createdFiles.push(createdFile)
      }
      // If an employeeId is provided, link the employee to this user
      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId)
        if (employee.userId && employee.userId !== user.id) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.exist_user_for_employee'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        employee.userId = user.id
        await employee.useTransaction(trx).save()
      }

      await user.load('personalData')

      if (user.personalData.cityId) await user.personalData.load('city')
      if (user.personalData.nationalityId) await user.personalData.load('nationality')
      if (user.personalData.sexId) await user.personalData.load('sex')
      if (user.personalData.stateCivilId) await user.personalData.load('stateCivil')
      if (user.personalData.typeIdentifyId) await user.personalData.load('typeIdentify')

      await user.useTransaction(trx).save()
      await trx.commit()

      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.lastNameP} ${user.personalData.lastNameM}`
        : 'Usuario'

      try {
        await mail.sendLater((message) => {
          message
            .to(user.email)
            .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
            .subject('SIGMI Nuevo Usuario')
            .htmlView('emails/user_password_recovery', {
              full_name,
              password,
              time: dateTime.toISO(),
            })
        })
      } catch (error) {
        console.error('Failed to send email:', error)
      }

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
      if (createdFiles.length)
        await Promise.all(createdFiles.map((file) => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async update(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'update')

    const { request, response, auth, i18n } = ctx
    const { params, email, signature, employeeId, personalData } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
          email: vine.string().email().optional(),
          business: vine.any().optional(),
          employeeId: vine
            .number()
            .positive()
            .exists({ table: 'employees', column: 'id' })
            .optional()
            .requiredIfMissing('personalData'),
          personalData: personalDataPartialSchema.optional().requiredIfMissing('employeeId'),
          signature: vine
            .file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' })
            .optional(),
        })
      )
    )
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request)
    const createdFiles: string[] = []

    try {
      const user = await User.findOrFail(params.id)
      user.useTransaction(trx)

      const candidateEmail = email ?? personalData?.email
      if (candidateEmail && candidateEmail !== user.email) {
        const existingUser = await User.findBy('email', candidateEmail)
        if (existingUser && existingUser.id !== user.id) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.existEmail'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        user.email = candidateEmail
      }

      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        createdFiles.push(resultUpload.url_short)
      }

      // If employeeId is provided, fetch employee and assign its personalDataId
      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId)
        if (!employee.personalDataId) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.employee_missing_personal_data'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        user.personalDataId = employee.personalDataId
      } else if (personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData
        try {
          if (photo) {
            const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')
            imageData = {
              photo: resultUploadPhoto.url,
              thumb: resultUploadPhoto.url_thumb,
              photoShort: resultUploadPhoto.url_short,
              thumbShort: resultUploadPhoto.url_thumb_short,
            }
            createdFile = resultUploadPhoto.url_short
          }

          if (user.personalDataId) {
            // Update existing personal data
            const pd = await PersonalData.findOrFail(user.personalDataId)
            pd.useTransaction(trx)
            pd.names = rPersonalData.names || pd.names
            pd.lastNameP = rPersonalData.lastNameP || pd.lastNameP
            pd.lastNameM = rPersonalData.lastNameM || pd.lastNameM
            pd.typeIdentifyId = rPersonalData.typeIdentifyId ?? null
            pd.identify = rPersonalData.identify ?? null
            pd.stateCivilId = rPersonalData.stateCivilId ?? null
            pd.sexId = rPersonalData.sexId ?? null
            pd.birthDate = rPersonalData.birthDate
              ? DateTime.fromJSDate(rPersonalData.birthDate)
              : null
            pd.nationalityId = rPersonalData.nationalityId ?? null
            pd.cityId = rPersonalData.cityId ?? null
            pd.address = rPersonalData.address ?? null
            pd.phone = rPersonalData.phone ?? ''
            pd.movil = rPersonalData.movil ?? null
            pd.email = rPersonalData.email ?? user.email
            pd.updatedAt = dateTime
            pd.updatedBy = auth.user!.id
            Object.assign(pd, imageData)
            await pd.save()
          } else {
            // Create new personal data
            const payloadPersonalData = {
              ...rPersonalData,
              ...imageData,
              birthDate: rPersonalData.birthDate
                ? DateTime.fromJSDate(rPersonalData.birthDate)
                : null,
              phone: rPersonalData.phone ?? null,
              createdAt: dateTime,
              updatedAt: dateTime,
              createdBy: auth.user!.id,
              updatedBy: auth.user!.id,
            }
            const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
            user.personalDataId = resPersonalData.id
          }
        } catch (error) {
          if (createdFile) await Google.deleteFile(createdFile)
          throw error
        }
      }

      user.updatedAt = dateTime
      await user.save()
      await trx.commit()

      return response.status(200).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      if (createdFiles.length)
        await Promise.all(createdFiles.map((file) => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async updateAdmin(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'update')

    const { request, response, auth, i18n } = ctx
    const { params, email, business, personalData, isAdmin, isAuthorizer, signature, employeeId } =
      await request.validateUsing(
        vine.compile(
          vine.object({
            params: vine.object({ userId: vine.number().positive() }),
            email: vine.string().email().optional(),
            employeeId: vine
              .number()
              .positive()
              .exists({ table: 'employees', column: 'id' })
              .optional()
              .requiredIfMissing('personalData'),
            business: vine
              .array(
                vine.object({
                  businessId: vine.number().positive(),
                  rolId: vine.number().positive().optional(),
                  permissions: vine.array(vine.number().positive()).optional(),
                  isSuper: vine.boolean().optional(),
                  isAuthorizer: vine.boolean().optional(),
                })
              )
              .optional(),
            personalData: personalDataPartialSchema.optional().requiredIfMissing('employeeId'),
            isAdmin: vine.boolean().optional(),
            isAuthorizer: vine.boolean().optional(),
            signature: vine
              .file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' })
              .optional(),
          })
        )
      )
    const trx = await db.transaction()
    const dateTime = await Util.getDateTimes(request)
    const createdFiles: string[] = []
    const filesToDelete: string[] = []

    try {
      const user = await User.findOrFail(params.userId)
      user.useTransaction(trx)

      // Update email if provided
      if (email && email !== user.email) {
        const existingUser = await User.findBy('email', email, { client: trx })
        if (existingUser && existingUser.id !== user.id) {
          await trx.rollback()
          return response.status(422).json({
            ...MessageFrontEnd(
              i18n.formatMessage('messages.existEmail'),
              i18n.formatMessage('messages.error_title')
            ),
          })
        }
        user.email = email
      }

      // Update admin flags
      if (isAdmin !== undefined) user.isAdmin = isAdmin
      if (isAuthorizer !== undefined) user.isAuthorizer = isAuthorizer

      // Handle signature upload
      if (signature) {
        if (user.signatureShort) filesToDelete.push(user.signatureShort)
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        createdFiles.push(resultUpload.url_short)
      }

      // Update business assignments if provided
      if (business && business.length > 0) {
        // Handle business user updates/creation
        if (user.isAdmin) {
          // For admin users, ensure they have access to ALL businesses with admin privileges
          const allBusinesses = await Business.all()
          for (const bus of allBusinesses) {
            let businessUser = await BusinessUser.query()
              .where('userId', user.id)
              .where('businessId', bus.id)
              .first()

            if (businessUser) {
              // Update existing
              businessUser.isSuper = true
              businessUser.isAuthorizer = 1
              await businessUser.useTransaction(trx).save()
            } else {
              // Create new
              businessUser = await BusinessUser.create(
                {
                  userId: user.id,
                  businessId: bus.id,
                  isSuper: true,
                  isAuthorizer: 1,
                },
                { client: trx }
              )
            }

            // Update/create role
            await businessUser.related('businessUserRols').query().delete()
            const businessUserRol = {
              businessUserId: businessUser.id,
              rolId: 1, // Default admin role
            }
            await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

            // Sync notification types from role to business user
            businessUser.useTransaction(trx)
            const ntRows2 = await db
              .from('notification_type_rols')
              .where('rol_id', businessUserRol.rolId)
              .select('notification_type_id')
            const ntIds2 = ntRows2.map((r: any) => Number(r.notification_type_id))
            if (ntIds2.length) {
              const ntData2: any = {}
              for (const ntId of ntIds2) {
                ntData2[ntId] = { created_at: DateTime.now().toSQL({ includeOffset: false }) }
              }
              await businessUser.related('notificationTypes').sync(ntData2)
            }
          }
        } else {
          // For non-admin users, update/create for each provided business
          for (const bus of business) {
            let businessUser = await BusinessUser.query()
              .where('userId', user.id)
              .where('businessId', bus.businessId)
              .first()

            if (businessUser) {
              // Update existing
              businessUser.isSuper = bus.isSuper || false
              businessUser.isAuthorizer = bus.isAuthorizer ? 1 : 0
              await businessUser.useTransaction(trx).save()
            } else {
              // Create new
              businessUser = await BusinessUser.create(
                {
                  userId: user.id,
                  businessId: bus.businessId,
                  isSuper: bus.isSuper || false,
                  isAuthorizer: bus.isAuthorizer ? 1 : 0,
                },
                { client: trx }
              )
            }

            // Update role
            await businessUser.related('businessUserRols').query().delete()
            const businessUserRol = {
              businessUserId: businessUser.id,
              rolId: bus.rolId || 0,
            }
            await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

            // Sync notification types from role to business user
            businessUser.useTransaction(trx)
            const ntRows3 = await db
              .from('notification_type_rols')
              .where('rol_id', businessUserRol.rolId)
              .select('notification_type_id')
            const ntIds3 = ntRows3.map((r: any) => Number(r.notification_type_id))
            if (ntIds3.length) {
              const ntData3: any = {}
              for (const ntId of ntIds3) {
                ntData3[ntId] = { created_at: DateTime.now().toSQL({ includeOffset: false }) }
              }
              await businessUser.related('notificationTypes').sync(ntData3)
            }

            // Update permissions
            await businessUser.related('bussinessUserPermissions').query().delete()
            const payloadPermission = (bus.permissions || []).map((permId) => ({
              businessUserId: businessUser.id,
              permissionId: permId,
            }))

            if (payloadPermission?.length)
              await businessUser
                .related('bussinessUserPermissions')
                .createMany(payloadPermission, { client: trx })
          }

          // Remove businessUsers not included in the provided array
          const providedBusinessIds = business.map((b) => b.businessId)
          const businessUsersToDelete = await BusinessUser.query({ client: trx })
            .where('userId', user.id)
            .whereNotIn('businessId', providedBusinessIds)
          for (const bu of businessUsersToDelete) {
            bu.useTransaction(trx)
            await bu.related('businessUserRols').query().delete()
            await bu.related('bussinessUserPermissions').query().delete()
            await bu.useTransaction(trx).delete()
          }
        }
      }

      // Update personal data if provided
      let modifyPersonalData = true
      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId, { client: trx })
        // Always assign selected employee to this user
        modifyPersonalData = false
        employee.userId = user.id
        if (employee.personalDataId) user.personalDataId = employee.personalDataId
        await employee.useTransaction(trx).save()
      }

      if (personalData && modifyPersonalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData

        if (photo) {
          const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')
          imageData = {
            photo: resultUploadPhoto.url,
            thumb: resultUploadPhoto.url_thumb,
            photoShort: resultUploadPhoto.url_short,
            thumbShort: resultUploadPhoto.url_thumb_short,
          }
          createdFile = resultUploadPhoto.url_short
        }

        if (user.personalDataId) {
          // Update existing personal data
          const pd = await PersonalData.findOrFail(user.personalDataId, { client: trx })
          pd.useTransaction(trx)
          if (pd.photoShort && photo) filesToDelete.push(pd.photoShort)
          pd.names = rPersonalData.names || pd.names
          pd.lastNameP = rPersonalData.lastNameP || pd.lastNameP
          pd.lastNameM = rPersonalData.lastNameM || pd.lastNameM
          pd.typeIdentifyId = rPersonalData.typeIdentifyId ?? null
          pd.identify = rPersonalData.identify ?? null
          pd.stateCivilId = rPersonalData.stateCivilId ?? null
          pd.sexId = rPersonalData.sexId ?? null
          pd.birthDate = rPersonalData.birthDate
            ? DateTime.fromJSDate(rPersonalData.birthDate)
            : null
          pd.nationalityId = rPersonalData.nationalityId ?? null
          pd.cityId = rPersonalData.cityId ?? null
          pd.address = rPersonalData.address ?? null
          // Only update phone when provided; never fall back to email (20-char column)
          if (rPersonalData.phone !== undefined) {
            pd.phone = rPersonalData.phone ?? null
          }
          pd.movil = rPersonalData.movil ?? null
          pd.email = rPersonalData.email ?? user.email
          pd.updatedAt = dateTime
          pd.updatedBy = auth.user!.id
          pd.merge(imageData)
          await pd.save()
        } else {
          // Create new personal data
          const payloadPersonalData = {
            ...rPersonalData,
            ...imageData,
            birthDate: rPersonalData.birthDate
              ? DateTime.fromJSDate(rPersonalData.birthDate)
              : null,
            phone: rPersonalData.phone ?? null,
            createdAt: dateTime,
            updatedAt: dateTime,
            createdBy: auth.user!.id,
            updatedBy: auth.user!.id,
          }
          const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
          user.personalDataId = resPersonalData.id
        }
        if (createdFile) createdFiles.push(createdFile)
      }

      user.updatedAt = dateTime
      await user.save()
      await trx.commit()

      // Delete old files after successful commit
      if (filesToDelete.length)
        await Promise.all(filesToDelete.map((file) => Google.deleteFile(file).catch(() => null)))

      await user.load('personalData')
      await user.load('businessUser', (q) =>
        q
          .preload('business', (q) => q.select('id', 'name'))
          .preload('businessUserRols', (q) => q.preload('rols', (q) => q.select('id', 'name')))
      )
      if (user.personalData.cityId) await user.personalData.load('city')
      if (user.personalData.nationalityId) await user.personalData.load('nationality')
      if (user.personalData.sexId) await user.personalData.load('sex')
      if (user.personalData.stateCivilId) await user.personalData.load('stateCivil')
      if (user.personalData.typeIdentifyId) await user.personalData.load('typeIdentify')

      return response.status(200).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.error(error)
      if (createdFiles.length)
        await Promise.all(createdFiles.map((file) => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async verifiedUser(ctx: HttpContext) {
    const { request, response, i18n } = ctx
    const { email, code } = request.all()
    const dateTime = await Util.getDateTimes(request)
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

    if (user.code === code && Util.parseToMoment(user.codeDateTime!) >= dateTime.toISO()!) {
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

  public async findByArgs(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'view')

    const { request } = ctx
    const { text } = request.all()
    const users = await UserRepository.findByArgs(text)
    return users
  }

  public async findByToken(ctx: HttpContext) {
    const { auth } = ctx
    const userId = auth.user!.id
    const userData = await UserRepository.findDataCompleteUserByUserId(userId)
    return userData
  }

  public async webRegisterEmail({ request, response, i18n }: HttpContext) {
    const { email } = request.all()
    const dateTime = await Util.getDateTimes(request)

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
        createdAt: dateTime,
        updatedAt: dateTime,
        client_id: -1,
        is_admin: false,
        in_app: false,
        employee_id: 0,
      }

      const newUser = await User.create(payload)
      newUser
      /*   await emitter.emit('new::userEmailStore', {
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
    const dateTime = await Util.getDateTimes(request)
    const user = await User.findBy('email', email)

    if (user) {
      if (user.code === code && Util.parseToMoment(user.codeDateTime!) >= dateTime.toISO()!) {
        user.verified = true
        user.verifiedAt = dateTime
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
            i18n.formatMessage(
              user.code === code ? 'messages.code_expired' : 'messages.code_error'
            ),
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
    const dateTime = await Util.getDateTimes(request)
    const user = await User.findBy('email', email)

    if (user) {
      try {
        user.password = password
        user.updatedAt = dateTime
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

  /**
   * Recover password by generating a random temporary password and emailing it to the user.
   * This does not expose the password publicly (only via email template).
   */
  public async recoverPassword({ request, response, i18n }: HttpContext) {
    const { email } = await request.validateUsing(
      vine.compile(vine.object({ email: vine.string().email() }))
    )
    const dateTime = await Util.getDateTimes(request)

    try {
      const user = await User.query()
        .where('email', email)
        .where('enabled', true)
        .where('verified', true)
        .preload('personalData', (q) =>
          q.select(['names', 'last_name_p', 'last_name_m']).preload('typeIdentify').preload('city')
        )
        .first()

      if (!user) {
        return response.status(404).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      // Generate a secure random password (12 chars alphanumeric)
      const raw = crypto.randomBytes(16).toString('base64')
      const tempPassword = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      // Ensure minimum length
      const finalPassword =
        tempPassword.length < 10
          ? tempPassword + crypto.randomBytes(4).toString('hex').slice(0, 2)
          : tempPassword

      user.password = finalPassword
      user.updatedAt = dateTime
      await user.save()

      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.lastNameP} ${user.personalData.lastNameM}`
        : 'Usuario'

      await emitter.emit('new::userPasswordRecovered', {
        email: user.email,
        full_name,
        password: finalPassword,
        time: dateTime.toISO()!,
      })

      return response.status(200).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.update_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      console.error(error)
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async webClientLogin({ request, response, auth, i18n }: HttpContext) {
    const dateTime = await Util.getDateTimes(request)
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

      /*       if (user.clientId <= 0 && user.clientId !== -1) {
              return response.status(500).json({
                ...MessageFrontEnd(
                  i18n.formatMessage('messages.user_error'),
                  i18n.formatMessage('messages.error_title')
                ),
              })
            } */

      if (!(await user.verifyPassword(password))) {
        return response.status(500).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.error_login'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const token = await auth.use('jwt').generate(user)
      user.lastLoginAt = dateTime
      user.lastLoginTz = await Util.getTimeZone(request.ip())
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

  /**
   * Update only the user signature image.
   */
  public async updateSignature({ request, response, i18n }: HttpContext) {
    const { params, signature } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
          signature: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request)
    try {
      const user = await User.findOrFail(params.id)
      const oldShort = user.signatureShort
      const upload = await Google.uploadFile(signature, 'signatures', 'image')
      user.signature = upload.url
      user.signatureShort = upload.url_short
      user.signatureThumb = upload.url_thumb
      user.signatureThumbShort = upload.url_thumb_short
      user.updatedAt = dateTime
      await user.save()
      await user.load('personalData', (q) => q.preload('typeIdentify').preload('city'))
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        user,
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
  }

  /**
   * Update only the PersonalData photo for a given user id.
   */
  public async updatePhoto({ request, response, i18n }: HttpContext) {
    const { params, photo } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
          photo: vine.file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request)
    try {
      const user = await User.findOrFail(params.id)
      if (!user.personalDataId) {
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.employee_missing_personal_data'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
      const personalData = await PersonalData.findOrFail(user.personalDataId)
      const oldShort = personalData.photoShort
      const upload = await Google.uploadFile(photo, 'personal_data', 'image')
      personalData.photo = upload.url
      personalData.thumb = upload.url_thumb
      personalData.photoShort = upload.url_short
      personalData.thumbShort = upload.url_thumb_short
      personalData.updatedAt = dateTime
      await personalData.save()
      await personalData.load('typeIdentify')
      await personalData.load('city')
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        personalData,
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
  }

  /**
   * Delete user signature image and clear signature fields.
   */
  public async deleteSignature({ request, response, i18n }: HttpContext) {
    const { params } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request)
    try {
      const user = await User.findOrFail(params.id)
      const oldShort = user.signatureShort
      user.signature = null as any
      user.signatureShort = null as any
      user.signatureThumb = null as any
      user.signatureThumbShort = null as any
      user.updatedAt = dateTime
      await user.save()
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.delete_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
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

  public async deletePhoto({ request, response, i18n }: HttpContext) {
    const { params } = await request.validateUsing(
      vine.compile(
        vine.object({
          params: vine.object({ id: vine.number().positive() }),
        })
      )
    )
    const dateTime = await Util.getDateTimes(request)
    try {
      const user = await User.findOrFail(params.id)
      if (!user.personalDataId) {
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.employee_missing_personal_data'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }
      const personalData = await PersonalData.findOrFail(user.personalDataId)
      const oldShort = personalData.photoShort
      personalData.photo = null
      personalData.thumb = null
      personalData.photoShort = null
      personalData.thumbShort = null
      personalData.updatedAt = dateTime
      await personalData.save()
      if (oldShort) await Google.deleteFile(oldShort).catch(() => null)
      return response.ok({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.delete_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
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

  public async findModules({ response, request }: HttpContext) {
    const { withPerms } = request.qs()
    const moduleQ = Module.query()

    if (withPerms)
      moduleQ.preload('permissions', (q) =>
        q.select('id', 'name', 'key', 'description', 'module_id')
      )

    const modules = await moduleQ
    response.ok(modules)
  }

  public async findPermission({ request, response }: HttpContext) {
    const { module_id } = await request.validateUsing(
      vine.compile(vine.object({ module_id: vine.number().positive() }))
    )
    const permissions = await Permission.query().where('module_id', module_id)
    response.ok(permissions)
  }

  // POST /user/findAutoComplete
  public async findAutoComplete(ctx: HttpContext) {
    await PermissionService.requirePermission(ctx, 'users', 'view')

    const { request } = ctx
    const { val } = await request.validateUsing(
      vine.compile(vine.object({ val: vine.string().trim() }))
    )
    const result = await UserRepository.findAutoComplete(val)
    return result
  }

  public async index(ctx: HttpContext) {
    const { request, response } = ctx
    await PermissionService.requirePermission(ctx, 'users', 'view')

    console.log('index')

    const { page, perPage, text, status } = await request.validateUsing(indexFiltersWithStatus)

    const query = User.query()
      .preload('personalData', (q) => q.preload('typeIdentify').preload('city'))
      .preload('businessUser', (q) =>
        q
          .preload('business', (q) => q.select('id', 'name'))
          .preload('businessUserRols', (q) => q.preload('rols', (q) => q.select('id', 'name')))
      )
      .preload('employee', (q) => q.preload('business', (business) => business.preload('position')))

    if (text) {
      const like = `%${text}%`
      query.where((qb) => {
        qb.whereILike('email', like).orWhereHas('personalData', (pdQ) =>
          pdQ
            .whereILike('names', like)
            .orWhereILike('last_name_p', like)
            .orWhereILike('last_name_m', like)
        )
      })
    }

    if (status !== undefined) query.where('enabled', status === 'enabled')

    const users = page ? await query.paginate(page, perPage ?? 10) : await query
    response.ok(users)
  }

  public async storeAdmin({ request, response, auth, i18n }: HttpContext) {
    // Similar to store, but for admin
    const dateTime = await Util.getDateTimes(request)
    const { email, business, personalData, signature, isAauthorizer, isAdmin, employeeId } =
      await request.validateUsing(
        vine.compile(
          vine.object({
            employeeId: vine.number().positive().optional(),
            email: vine.string().email(),
            isAdmin: vine.boolean().optional(),
            isAauthorizer: vine.boolean().optional(),
            business: vine
              .array(
                vine.object({
                  businessId: vine.number().positive(),
                  rolId: vine.number().positive().optional(),
                  permissions: vine.array(vine.number().positive()).optional(),
                  isSuper: vine.boolean().optional(),
                  isAuthorizer: vine.boolean().optional(),
                })
              )
              .optional(),
            personalData: personalDataSchema.optional(),
            signature: vine
              .file({ extnames: ['jpg', 'jpeg', 'png', 'webp'], size: '5mb' })
              .optional(),
          })
        )
      )
    const createdFiles: string[] = []
    const trx = await db.transaction()

    try {
      const existingUser = await User.findBy('email', email)
      if (existingUser) {
        await trx.rollback()
        return response.status(422).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.existEmail'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      const password = Util.getCode()
      const user = await User.create(
        {
          email,
          password: password,
          isAuthorizer: isAauthorizer ?? false,
          createdAt: dateTime,
          updatedAt: dateTime,
          enabled: true,
          verified: true,
          isAdmin: isAdmin ?? false,
        },
        { client: trx }
      )

      if (signature) {
        const resultUpload = await Google.uploadFile(signature, 'signatures', 'image')
        user.signature = resultUpload.url
        user.signatureShort = resultUpload.url_short
        user.signatureThumb = resultUpload.url_thumb
        user.signatureThumbShort = resultUpload.url_thumb_short
        await user.useTransaction(trx).save()
        createdFiles.push(resultUpload.url_short)
      }

      // Handle business user creation
      if (isAdmin) {
        // For admin users, create businessUser entries for ALL businesses
        const allBusinesses = await Business.query().select('id').exec()
        let selected = true
        for (const business of allBusinesses) {
          const businessUser = await BusinessUser.create(
            {
              userId: user.id,
              selected,
              businessId: business.id,
              isSuper: true,
              isAuthorizer: 1, // true = 1
            },
            { client: trx }
          )
          // Create default role for admin users
          const businessUserRol = {
            businessUserId: businessUser.id,
            rolId: 1, // Default admin role
          }

          await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

          // Sync notification types from role to business user (admin default role)
          businessUser.useTransaction(trx)
          const adminNt = await db
            .from('notification_type_rols')
            .where('rol_id', businessUserRol.rolId)
            .select('notification_type_id')
          const adminNtIds = adminNt.map((r: any) => Number(r.notification_type_id))
          if (adminNtIds.length) {
            const adminNtData: any = {}
            for (const ntId of adminNtIds) {
              adminNtData[ntId] = { created_at: DateTime.now().toSQL({ includeOffset: false }) }
            }
            await businessUser.related('notificationTypes').sync(adminNtData)
          }

          selected = false
        }
      } else if (business) {
        // For non-admin users, process the provided business array

        let selected = true

        for (const bus of business) {
          const payloadBusinessUser = {
            userId: user.id,
            businessId: bus.businessId,
            isSuper: bus.isSuper ?? false,
            isAuthorizer: bus.isAuthorizer ? 1 : 0,
            selected,
          }

          const businessUser = await BusinessUser.create(payloadBusinessUser, { client: trx })

          const businessUserRol = {
            businessUserId: businessUser.id,
            rolId: bus.rolId || 0,
          }

          await businessUser.related('businessUserRols').create(businessUserRol, { client: trx })

          // Sync notification types for this role to the created business user
          businessUser.useTransaction(trx)
          const ntRows4 = await db
            .from('notification_type_rols')
            .where('rol_id', businessUserRol.rolId)
            .select('notification_type_id')
          const ntIds4 = ntRows4.map((r: any) => Number(r.notification_type_id))
          if (ntIds4.length) {
            const ntData4: any = {}
            for (const ntId of ntIds4) {
              ntData4[ntId] = { created_at: DateTime.now().toSQL({ includeOffset: false }) }
            }
            await businessUser.related('notificationTypes').sync(ntData4)
          }

          const payloadPermission = (bus.permissions || []).map((permId) => ({
            businessUserId: businessUser.id,
            permissionId: permId,
          }))

          if (payloadPermission?.length)
            await businessUser
              .related('bussinessUserPermissions')
              .createMany(payloadPermission, { client: trx })

          selected = false
        }
      }

      if (employeeId) {
        const employee = await Employee.findOrFail(employeeId, { client: trx })
        employee.userId = user.id
        if (employee.personalDataId) user.personalDataId = employee.personalDataId
        await employee.useTransaction(trx).save()
      } else if (personalData) {
        let imageData = {}
        let createdFile: string | null = null
        const { photo, ...rPersonalData } = personalData

        if (photo) {
          const resultUploadPhoto = await Google.uploadFile(photo, 'personal_data', 'image')
          imageData = {
            photo: resultUploadPhoto.url,
            thumb: resultUploadPhoto.url_thumb,
            photoShort: resultUploadPhoto.url_short,
            thumbShort: resultUploadPhoto.url_thumb_short,
          }
          createdFile = resultUploadPhoto.url_short
        }

        const payloadPersonalData = {
          ...rPersonalData,
          ...imageData,
          email: personalData.email || user.email,
          birthDate: rPersonalData.birthDate ? DateTime.fromJSDate(rPersonalData.birthDate) : null,
          phone: rPersonalData.phone ?? null,
          createdAt: dateTime,
          updatedAt: dateTime,
          createdBy: auth.user!.id,
          updatedBy: auth.user!.id,
        }

        const resPersonalData = await PersonalData.create(payloadPersonalData, { client: trx })
        user.personalDataId = resPersonalData.id
        if (createdFile) createdFiles.push(createdFile)
      }

      await user.load('businessUser', (q) =>
        q
          .preload('business', (q) => q.select('id', 'name'))
          .preload('businessUserRols', (q) => q.preload('rols', (q) => q.select('id', 'name')))
      )
      await user.load('personalData', (pQ) => pQ.preload('typeIdentify'))
      await user.load('employee', (q) =>
        q.preload('business', (business) => business.preload('position'))
      )

      if (user.personalData?.cityId) await user.personalData.load('city')

      await user.useTransaction(trx).save()

      await trx.commit()

      await mail.send((message) => {
        message
          .to(user.email)
          .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
          .subject('SIGMI Nuevo Usuario')
          .htmlView('emails/user_password_recovery', {
            full_name: user.personalData.fullName,
            password: password,
            time: dateTime.toISO(),
          })
      })

      return response.status(201).json({
        user,
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_ok'),
          i18n.formatMessage('messages.ok_title')
        ),
      })
    } catch (error) {
      await trx.rollback()
      console.log(error)
      if (createdFiles.length)
        await Promise.all(createdFiles.map((file) => Google.deleteFile(file)))
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.store_error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async storeCodeConfirm({ request, response, i18n }: HttpContext) {
    const { email } = await request.validateUsing(
      vine.compile(vine.object({ email: vine.string().email() }))
    )

    try {
      const user = await User.findBy('email', email)
      if (!user) {
        return response.status(404).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.no_exist'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      user.code = Util.getCode().toString()
      user.codeDateTime = DateTime.now().plus({ hours: 1 })
      await user.save()

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
          i18n.formatMessage('messages.error'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async verifyCodeConfirm({ request, response, i18n }: HttpContext) {
    const { email, code } = await request.validateUsing(
      vine.compile(vine.object({ email: vine.string().email(), code: vine.string() }))
    )
    const dateTime = await Util.getDateTimes(request)
    const user = await User.findBy('email', email)

    if (!user) {
      return response.status(404).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_exist'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    if (
      user.code === code &&
      user.codeDateTime &&
      user.codeDateTime.toISO()! >= dateTime.toISO()!
    ) {
      user.verified = true
      user.code = null
      user.codeDateTime = null
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
          user.code === code ? 'messages.code_expired' : 'messages.code_error',
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async show({ params, response, i18n }: HttpContext) {
    try {
      const user = await User.query()
        .where('id', params.id)
        .preload('personalData', (q) => q.preload('typeIdentify').preload('city'))
        .preload('businessUser', (buQ) => buQ.preload('business', (bQ) => bQ.select('id', 'name')))
        .preload('employee', (q) =>
          q.preload('business', (business) => business.preload('position'))
        )
        .first()

      if (!user) {
        return response.status(404).json({
          ...MessageFrontEnd(
            i18n.formatMessage('messages.user_not_found'),
            i18n.formatMessage('messages.error_title')
          ),
        })
      }

      return response.json({
        success: true,
        data: user,
        message: i18n.formatMessage('messages.user_found'),
      })
    } catch (error) {
      return response.status(500).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.error_occurred'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }
  }

  public async toggleUserStatus({ params, response, i18n }: HttpContext) {
    const dateTime = DateTime.now()

    try {
      const user = await User.findOrFail(params.id)
      const wasEnabled = user.enabled
      user.enabled = !user.enabled
      user.updatedAt = dateTime
      await user.save()

      return response.status(200).json({
        ...MessageFrontEnd(
          i18n.formatMessage(wasEnabled ? 'messages.user_disabled' : 'messages.user_enabled'),
          i18n.formatMessage('messages.ok_title')
        ),
        enabled: user.enabled,
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
  }

  public async adminResetPassword({ request, response, auth, i18n }: HttpContext) {
    const { userId } = await request.validateUsing(
      vine.compile(
        vine.object({
          userId: vine.number().positive(),
        })
      )
    )
    const dateTime = DateTime.now()

    // Check if current user is admin
    if (!auth.user!.isAdmin) {
      return response.status(403).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.no_permission'),
          i18n.formatMessage('messages.error_title')
        ),
      })
    }

    try {
      const user = await User.findOrFail(userId)

      // Generate a secure random password (12 chars alphanumeric)
      const raw = crypto.randomBytes(16).toString('base64')
      const tempPassword = raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)
      // Ensure minimum length
      const finalPassword =
        tempPassword.length < 10
          ? tempPassword + crypto.randomBytes(4).toString('hex').slice(0, 2)
          : tempPassword

      user.password = finalPassword
      user.updatedAt = dateTime
      await user.save()

      // Load personal data for email
      await user.load('personalData')
      const full_name = user.personalData
        ? `${user.personalData.names} ${user.personalData.lastNameP} ${user.personalData.lastNameM}`
        : 'Usuario'

      try {
        await mail.sendLater((message) => {
          message
            .to(user.email)
            .from(env.get('MAIL_FROM') || 'sigmi@accounts.com')
            .subject('SIGMI - Contraseña Restablecida')
            .htmlView('emails/user_password_recovery', {
              full_name,
              password: finalPassword,
              time: dateTime.toISO(),
            })
        })
      } catch (error) {
        console.error('Failed to send email:', error)
      }

      return response.status(200).json({
        ...MessageFrontEnd(
          i18n.formatMessage('messages.password_reset_success'),
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
  }
}
