import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import {
  AuthKitProvider,
  useAccessToken,
  useAuth,
} from '@workos/authkit-tanstack-react-start/client'
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'
import { useCallback, useMemo, type ReactNode } from 'react'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
  let convexClient: ConvexReactClient | undefined
  if (convexUrl) convexClient = new ConvexReactClient(convexUrl)

  let convexQueryClient: ConvexQueryClient | undefined
  if (convexClient) convexQueryClient = new ConvexQueryClient(convexClient)

  let defaultOptions
  if (convexQueryClient) {
    defaultOptions = {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
        staleTime: Infinity,
      },
    }
  }
  const queryClient = new QueryClient({
    defaultOptions,
  })

  convexQueryClient?.connect(queryClient)

  return routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient, convexQueryClient },
      scrollRestoration: true,
      defaultNotFoundComponent: () => <p>That page does not exist.</p>,
      InnerWrap: ({ children }) => (
        <AppProviders convexQueryClient={convexQueryClient}>{children}</AppProviders>
      ),
    }),
    queryClient,
  )
}

function AppProviders({
  convexQueryClient,
  children,
}: {
  convexQueryClient?: ConvexQueryClient
  children: ReactNode
}) {
  if (!convexQueryClient) return <AuthKitProvider>{children}</AuthKitProvider>

  return (
    <AuthKitProvider>
      <ConvexProviderWithAuth client={convexQueryClient.convexClient} useAuth={useAuthFromWorkOS}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  )
}

function useAuthFromWorkOS() {
  const { loading, user } = useAuth()
  const { getAccessToken, refresh } = useAccessToken()

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) return null
      if (forceRefreshToken) return (await refresh()) ?? null
      return (await getAccessToken()) ?? null
    },
    [getAccessToken, refresh, user],
  )

  return useMemo(
    () => ({
      isLoading: loading,
      isAuthenticated: Boolean(user),
      fetchAccessToken,
    }),
    [fetchAccessToken, loading, user],
  )
}
