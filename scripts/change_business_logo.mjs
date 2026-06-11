import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const DEFAULT_API_URL = 'http://localhost:3334/api/v2'
const DEFAULT_BUSINESS_ID = 1
const DEFAULT_EMAIL = 'g.rangel1987@gmail.com'

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help || !options.logoPath) {
    printUsage()
    process.exit(options.help ? 0 : 1)
  }

  const password = process.env.SIGMI_PASSWORD
  if (!password) {
    console.error('Missing SIGMI_PASSWORD environment variable.')
    process.exit(1)
  }

  const apiUrl = (options.apiUrl || process.env.SIGMI_API_URL || DEFAULT_API_URL).replace(/\/$/, '')
  const businessId = Number(options.businessId || process.env.SIGMI_BUSINESS_ID || DEFAULT_BUSINESS_ID)
  const email = options.email || process.env.SIGMI_EMAIL || DEFAULT_EMAIL

  if (!Number.isFinite(businessId) || businessId <= 0) {
    throw new Error('Invalid business id.')
  }

  const accessToken = await login(apiUrl, email, password)
  const business = await fetchBusiness(apiUrl, businessId, accessToken)
  const formData = await buildBusinessFormData(business, options.logoPath)
  const updatedBusiness = await updateBusiness(apiUrl, businessId, accessToken, formData)

  console.log('Business logo updated successfully.')
  console.log(
    JSON.stringify(
      {
        businessId: updatedBusiness?.id ?? businessId,
        url: updatedBusiness?.url ?? null,
        urlThumb: updatedBusiness?.urlThumb ?? null,
      },
      null,
      2
    )
  )
}

function parseArgs(args) {
  const options = {
    logoPath: '',
    apiUrl: '',
    businessId: '',
    email: '',
    help: false,
  }

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]

    if (value === '--help' || value === '-h') {
      options.help = true
      continue
    }

    if (value === '--logo' || value === '-l') {
      options.logoPath = args[index + 1] || ''
      index += 1
      continue
    }

    if (value === '--api-url') {
      options.apiUrl = args[index + 1] || ''
      index += 1
      continue
    }

    if (value === '--business-id') {
      options.businessId = args[index + 1] || ''
      index += 1
      continue
    }

    if (value === '--email') {
      options.email = args[index + 1] || ''
      index += 1
      continue
    }

    if (!value.startsWith('-') && !options.logoPath) {
      options.logoPath = value
    }
  }

  return options
}

function printUsage() {
  console.log(`Usage:
  node scripts/change_business_logo.mjs --logo <path-to-image> [--api-url <url>] [--business-id <id>] [--email <email>]

Environment variables:
  SIGMI_PASSWORD    Required. Password for the login user.
  SIGMI_API_URL     Optional. Defaults to ${DEFAULT_API_URL}
  SIGMI_BUSINESS_ID Optional. Defaults to ${DEFAULT_BUSINESS_ID}
  SIGMI_EMAIL       Optional. Defaults to ${DEFAULT_EMAIL}

Examples:
  SIGMI_PASSWORD=secret node scripts/change_business_logo.mjs --logo .\\tmp\\new-logo.png
  SIGMI_PASSWORD=secret node scripts/change_business_logo.mjs .\\tmp\\new-logo.png --api-url http://localhost:3334/api/v2
`)
}

async function login(apiUrl, email, password) {
  const response = await fetch(`${apiUrl}/account/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Login failed: ${JSON.stringify(payload)}`)
  }

  const token = payload?.accessToken?.token
  if (!token) {
    throw new Error(`Login response does not include an access token: ${JSON.stringify(payload)}`)
  }

  return token
}

async function fetchBusiness(apiUrl, businessId, accessToken) {
  const response = await fetch(`${apiUrl}/business/find/id/${businessId}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Unable to fetch business ${businessId}: ${JSON.stringify(payload)}`)
  }

  return payload
}

async function buildBusinessFormData(business, logoPath) {
  const resolvedLogoPath = resolve(logoPath)
  const fileBuffer = await readFile(resolvedLogoPath)
  const formData = new FormData()

  appendFormValue(formData, 'name', business.name)
  appendFormValue(formData, 'countryId', resolveBusinessValue(business, 'countryId', 'country_id', 'country.id'))
  appendFormValue(
    formData,
    'typeIdentifyId',
    resolveBusinessValue(business, 'typeIdentifyId', 'type_identify_id', 'typeIdentify.id')
  )
  appendFormValue(formData, 'identify', business.identify)
  appendFormValue(formData, 'address', business.address)
  appendFormValue(formData, 'phone', business.phone)
  appendFormValue(formData, 'email', business.email)
  appendFormValue(
    formData,
    'daysExpireBuget',
    resolveBusinessValue(business, 'daysExpireBuget', 'days_expire_buget')
  )

  if (Array.isArray(business.coins)) {
    for (const coinId of business.coins.map(resolveCoinId).filter(Boolean)) {
      formData.append('coins[]', String(coinId))
    }
  }

  if (business.delegate) {
    appendOptionalFormValue(formData, 'delegateName', business.delegate.name)
    appendOptionalFormValue(
      formData,
      'delegateTypeIdentifyId',
      resolveBusinessValue(business.delegate, 'typeIdentifyId', 'type_identify_id')
    )
    appendOptionalFormValue(formData, 'delegateIdentify', business.delegate.identify)
    appendOptionalFormValue(formData, 'delegatePhone', business.delegate.phone)
    appendOptionalFormValue(formData, 'delegateEmail', business.delegate.email)
  }

  const authorizationMinor = resolveBusinessValue(
    business,
    'authorizationMinor',
    'authorization_minor'
  )
  if (authorizationMinor !== undefined && authorizationMinor !== null) {
    appendFormValue(formData, 'authorizationMinor', authorizationMinor)
  }

  const emailConfirmInactiveEmployee = resolveBusinessValue(
    business,
    'emailConfirmInactiveEmployee',
    'email_confirm_inactive_employee'
  )
  if (emailConfirmInactiveEmployee !== undefined && emailConfirmInactiveEmployee !== null) {
    appendFormValue(
      formData,
      'emailConfirmInactiveEmployee',
      emailConfirmInactiveEmployee
    )
  }

  const fileName = basename(resolvedLogoPath)
  const mimeType = getMimeType(fileName)
  formData.append('photo', new Blob([fileBuffer], { type: mimeType }), fileName)

  return formData
}

function appendFormValue(formData, key, value) {
  formData.append(key, typeof value === 'boolean' ? String(value) : String(value ?? ''))
}

function appendOptionalFormValue(formData, key, value) {
  if (value !== undefined && value !== null && value !== '') {
    appendFormValue(formData, key, value)
  }
}

function resolveCoinId(coin) {
  return coin?.coinId ?? coin?.coin_id ?? coin?.coins?.id ?? coin?.coin?.id ?? null
}

function resolveBusinessValue(source, ...paths) {
  for (const path of paths) {
    const value = getPathValue(source, path)
    if (value !== undefined && value !== null && value !== '') {
      return value
    }
  }

  return undefined
}

function getPathValue(source, path) {
  return path.split('.').reduce((current, key) => current?.[key], source)
}

function getMimeType(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}

async function updateBusiness(apiUrl, businessId, accessToken, formData) {
  const response = await fetch(`${apiUrl}/business/update/${businessId}`, {
    method: 'PUT',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: formData,
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Business update failed: ${JSON.stringify(payload)}`)
  }

  return payload?.business ?? payload
}

async function readJson(response) {
  const text = await response.text()
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})