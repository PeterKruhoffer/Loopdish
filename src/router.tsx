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
import { useCallback, useMemo } from 'react'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
  const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : undefined
  const convexQueryClient = convexClient ? new ConvexQueryClient(convexClient) : undefined
  const queryClient = new QueryClient({
    defaultOptions: convexQueryClient
      ? {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
            staleTime: Infinity,
          },
        }
      : undefined,
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
        <AuthKitProvider>
          {convexQueryClient ? (
            <ConvexProviderWithAuth
              client={convexQueryClient.convexClient}
              useAuth={useAuthFromWorkOS}
            >
              {children}
            </ConvexProviderWithAuth>
          ) : (
            children
          )}
        </AuthKitProvider>
      ),
    }),
    queryClient,
  )
}

function useAuthFromWorkOS() {
  const { loading, user } = useAuth()
  const { getAccessToken, refresh } = useAccessToken()

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!user) return null
      return forceRefreshToken ? ((await refresh()) ?? null) : ((await getAccessToken()) ?? null)
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
