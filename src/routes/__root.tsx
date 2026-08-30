import type { ConvexQueryClient } from '@convex-dev/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { getAuth } from '@workos/authkit-tanstack-react-start'
import { useEffect, type ReactNode } from 'react'
import { useI18n } from '~/lib/i18n'
import '~/styles/global.css'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
  convexQueryClient?: ConvexQueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#fff9e9' },
      {
        name: 'description',
        content: 'Remember what you ate and plan what comes next.',
      },
      { title: 'LoopDish' },
    ],
    links: [
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'icon', href: '/icon-192.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const auth = await getAuth()
    if (auth.user) {
      context.convexQueryClient?.serverHttpClient?.setAuth(auth.accessToken)
    }
    return { user: auth.user }
  },
  component: RootComponent,
})

function RootComponent() {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  const { language } = useI18n()
  return (
    <html lang={language}>
      <head>
        <HeadContent />
      </head>
      <body>
        <DevelopmentStyles />
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function DevelopmentStyles() {
  if (!import.meta.env.DEV) return null
  return <link href="/virtual:stylex.css" rel="stylesheet" />
}
