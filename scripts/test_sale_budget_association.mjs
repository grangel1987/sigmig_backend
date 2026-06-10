const DEFAULT_API_URL = 'http://localhost:3334/api/v2'
const DEFAULT_BUSINESS_ID = 1
const DEFAULT_EMAIL = 'g.rangel1987@gmail.com'

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printUsage()
    process.exit(0)
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
  const sales = await fetchSales(apiUrl, businessId, accessToken)
  const budgets = await fetchBudgets(apiUrl, businessId, accessToken)

  const sale = pickSale(sales)
  const budget = pickBudget(budgets)

  if (!sale) {
    throw new Error(`No sales found for business ${businessId}.`)
  }

  if (!budget) {
    throw new Error(`No budgets found for business ${businessId}.`)
  }

  const beforeSale = await fetchSale(apiUrl, businessId, sale.id, accessToken)
  const associationPayload = { budgetId: budget.id }
  const associationResponse = await associateSale(apiUrl, businessId, sale.id, accessToken, associationPayload)
  const afterSale = await fetchSale(apiUrl, businessId, sale.id, accessToken)

  console.log(
    JSON.stringify(
      {
        selected: {
          sale: summarizeSale(sale),
          budget: summarizeBudget(budget),
        },
        request: associationPayload,
        before: summarizeSale(beforeSale),
        associateResponse: summarizeSale(associationResponse?.sale ?? associationResponse),
        after: summarizeSale(afterSale),
      },
      null,
      2
    )
  )
}

function parseArgs(args) {
  const options = {
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
    }
  }

  return options
}

function printUsage() {
  console.log(`Usage:
  node scripts/test_sale_budget_association.mjs [--api-url <url>] [--business-id <id>] [--email <email>]

Environment variables:
  SIGMI_PASSWORD    Required. Password for the login user.
  SIGMI_API_URL     Optional. Defaults to ${DEFAULT_API_URL}
  SIGMI_BUSINESS_ID Optional. Defaults to ${DEFAULT_BUSINESS_ID}
  SIGMI_EMAIL       Optional. Defaults to ${DEFAULT_EMAIL}

What it does:
  1. Logs in
  2. Fetches sales and budgets for the business
  3. Picks one sale and one budget
  4. Calls PUT /sales/associate/:id with { budgetId }
  5. Prints before/after association fields
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

async function fetchSales(apiUrl, businessId, accessToken) {
  const response = await fetch(`${apiUrl}/sales?businessId=${businessId}&page=1&perPage=20`, {
    headers: buildAuthHeaders(accessToken, businessId),
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Unable to fetch sales: ${JSON.stringify(payload)}`)
  }

  return extractCollection(payload)
}

async function fetchBudgets(apiUrl, businessId, accessToken) {
  const response = await fetch(`${apiUrl}/buget?businessId=${businessId}&page=1&perPage=20`, {
    headers: buildAuthHeaders(accessToken, businessId),
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Unable to fetch budgets: ${JSON.stringify(payload)}`)
  }

  return extractCollection(payload)
}

async function fetchSale(apiUrl, businessId, saleId, accessToken) {
  const response = await fetch(`${apiUrl}/sales/show/${saleId}`, {
    headers: buildAuthHeaders(accessToken, businessId),
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Unable to fetch sale ${saleId}: ${JSON.stringify(payload)}`)
  }

  return payload?.sale ?? payload
}

async function associateSale(apiUrl, businessId, saleId, accessToken, body) {
  const response = await fetch(`${apiUrl}/sales/associate/${saleId}`, {
    method: 'PUT',
    headers: {
      ...buildAuthHeaders(accessToken, businessId),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = await readJson(response)
  if (!response.ok) {
    throw new Error(`Unable to associate sale ${saleId}: ${JSON.stringify(payload)}`)
  }

  return payload
}

function buildAuthHeaders(accessToken, businessId) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
    Business: String(businessId),
  }
}

function extractCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.data?.data)) {
    return payload.data.data
  }

  return []
}

function pickSale(sales) {
  return (
    sales.find((sale) => sale && sale.id && (sale.budgetId === null || sale.budgetId === undefined)) ||
    sales.find((sale) => sale && sale.id) ||
    null
  )
}

function pickBudget(budgets) {
  return budgets.find((budget) => budget && budget.id) || null
}

function summarizeSale(sale) {
  if (!sale) {
    return null
  }

  return {
    id: sale.id ?? null,
    nro: sale.nro ?? null,
    title: sale.title ?? null,
    status: sale.status ?? null,
    budgetId: sale.budgetId ?? null,
    shoppingId: sale.shoppingId ?? null,
    budget: summarizeNestedDocument(sale.budget),
    shopping: summarizeNestedDocument(sale.shopping),
  }
}

function summarizeBudget(budget) {
  if (!budget) {
    return null
  }

  return {
    id: budget.id ?? null,
    nro: budget.nro ?? null,
    status: budget.status ?? null,
    enabled: budget.enabled ?? null,
    clientId: budget.clientId ?? budget.client_id ?? budget.client?.id ?? null,
  }
}

function summarizeNestedDocument(document) {
  if (!document) {
    return null
  }

  return {
    id: document.id ?? null,
    nro: document.nro ?? null,
    status: document.status ?? null,
  }
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