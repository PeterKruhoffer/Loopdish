const apiKey = process.env.WORKOS_API_KEY
const publicUrl = process.env.PUBLIC_URL

if (!apiKey || !publicUrl) {
  throw new Error('WORKOS_API_KEY and PUBLIC_URL are required')
}

const origin = new URL(publicUrl).origin
const redirectUri = `${origin}/api/auth/callback`
const headers = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json',
}

async function request(path, init) {
  const response = await fetch(`https://api.workos.com${path}`, {
    ...init,
    headers,
  })
  if (!response.ok) {
    throw new Error(`WorkOS preview registration failed with HTTP ${response.status}`)
  }
  return response.status === 204 ? undefined : response.json()
}

async function ensureRegistered(path, field, value) {
  const result = await request(path)
  if (result.data.some((entry) => entry[field] === value)) return
  await request(path, {
    method: 'POST',
    body: JSON.stringify({ [field]: value }),
  })
}

await Promise.all([
  ensureRegistered('/user_management/redirect_uris?limit=100', 'uri', redirectUri),
  ensureRegistered('/user_management/cors_origins?limit=100', 'origin', origin),
])

console.log(`Registered WorkOS preview origin ${origin}`)
