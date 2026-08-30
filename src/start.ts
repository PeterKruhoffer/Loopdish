import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import {
  authkitMiddleware,
  type AuthKitMiddlewareOptions,
} from '@workos/authkit-tanstack-react-start'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '')
let authOptions: AuthKitMiddlewareOptions | undefined
if (publicUrl) authOptions = { redirectUri: `${publicUrl}/api/auth/callback` }

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, authkitMiddleware(authOptions)],
}))
