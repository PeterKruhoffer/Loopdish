import { createCsrfMiddleware, createStart } from '@tanstack/react-start'
import { authkitMiddleware } from '@workos/authkit-tanstack-react-start'

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

const publicUrl = process.env.PUBLIC_URL?.replace(/\/$/, '')

export const startInstance = createStart(() => ({
  requestMiddleware: [
    csrfMiddleware,
    authkitMiddleware(publicUrl ? { redirectUri: `${publicUrl}/api/auth/callback` } : undefined),
  ],
}))
