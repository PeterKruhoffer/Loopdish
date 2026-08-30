import * as stylex from '@stylexjs/stylex'
import { useRouterState } from '@tanstack/react-router'
import { useTransition } from 'react'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'

const skeletonShimmer = stylex.keyframes({
  from: { backgroundPosition: '180% 0' },
  to: { backgroundPosition: '-80% 0' },
})

const navigationProgress = stylex.keyframes({
  from: { transform: 'translateX(-110%)' },
  to: { transform: 'translateX(245%)' },
})

const styles = stylex.create({
  navigationTrack: {
    position: 'fixed',
    zIndex: 100,
    top: 0,
    right: 0,
    left: 0,
    height: 3,
    overflow: 'hidden',
    backgroundColor: 'rgb(239 99 73 / 16%)',
  },
  navigationBar: {
    display: 'block',
    width: '100%',
    height: '100%',
    backgroundColor: colors.coral,
    [motion]: {
      width: '42%',
      animation: `${navigationProgress} 820ms ease-in-out infinite`,
    },
  },
  routePending: {
    width: 'min(100% - 32px, 1080px)',
    margin: '0 auto',
    paddingTop: 92,
    paddingBottom: 116,
    [tablet]: {
      width: 'min(100% - 64px, 1080px)',
      paddingTop: 116,
      paddingBottom: 80,
    },
  },
  loading: {
    display: 'grid',
    gap: 14,
    marginTop: 48,
    [tablet]: { marginTop: 72 },
  },
  loadingWeek: { marginTop: 0 },
  days: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 7, [tablet]: { gap: 12 } },
  day: {
    height: 66,
    borderRadius: 24,
    backgroundColor: '#ebe4d2',
    [tablet]: { height: 72 },
  },
  heading: { width: 150, height: 25, borderRadius: 8, backgroundColor: '#e4ddca' },
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
  },
  card: {
    minHeight: 190,
    borderRadius: 23,
    backgroundColor: '#eee5d2',
  },
  weekCard: {
    minHeight: 300,
    borderRadius: 28,
    backgroundColor: '#efd1bd',
    [tablet]: { minHeight: 350 },
  },
  skeletonShimmer: {
    backgroundImage:
      'linear-gradient(105deg, transparent 20%, rgb(255 254 249 / 82%) 46%, rgb(255 255 255 / 96%) 50%, rgb(255 254 249 / 82%) 54%, transparent 80%)',
    backgroundSize: '260% 100%',
    [motion]: { animation: `${skeletonShimmer} 1.05s linear infinite` },
  },
  visuallyHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  error: {
    display: 'grid',
    minHeight: 180,
    placeItems: 'center',
    alignContent: 'center',
    gap: 14,
    padding: 24,
    border: `1px solid ${colors.line}`,
    borderRadius: 24,
    color: colors.muted,
    backgroundColor: 'rgb(255 254 249 / 72%)',
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 40,
    padding: '0 16px',
    border: 0,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 11,
    fontWeight: 800,
  },
})

export function NavigationIndicator() {
  const isLoading = useRouterState({ select: (state) => state.isLoading })
  const { t } = useI18n()
  if (!isLoading) return null

  return (
    <div {...stylex.props(styles.navigationTrack)} aria-label={t.loading} role="progressbar">
      <span {...stylex.props(styles.navigationBar)} />
    </div>
  )
}

export function RoutePending() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return (
    <main {...stylex.props(styles.routePending)}>
      <DashboardSkeleton view={pathname === '/week' ? 'week' : 'dishes'} />
    </main>
  )
}

export function DashboardSkeleton({ view }: { view: 'week' | 'dishes' }) {
  const { t } = useI18n()
  const isWeek = view === 'week'

  return (
    <section
      {...stylex.props(styles.loading, isWeek && styles.loadingWeek)}
      aria-busy="true"
      aria-live="polite"
    >
      <span {...stylex.props(styles.visuallyHidden)}>{t.loading}</span>
      {isWeek ? (
        <>
          <div {...stylex.props(styles.days)} aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <div {...stylex.props(styles.day, styles.skeletonShimmer)} key={index} />
            ))}
          </div>
          <div {...stylex.props(styles.weekCard, styles.skeletonShimmer)} aria-hidden="true" />
        </>
      ) : (
        <>
          <div {...stylex.props(styles.heading, styles.skeletonShimmer)} aria-hidden="true" />
          <div {...stylex.props(styles.cards)} aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <div {...stylex.props(styles.card, styles.skeletonShimmer)} key={index} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export function DashboardError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => Promise<unknown>
}) {
  const { t } = useI18n()
  const [isRetrying, startRetryAction] = useTransition()
  return (
    <div {...stylex.props(styles.error)} role="alert">
      <p>{message}</p>
      <button
        {...stylex.props(styles.retryButton)}
        disabled={isRetrying}
        type="button"
        onClick={() =>
          startRetryAction(async () => {
            await onRetry()
          })
        }
      >
        {t.tryAgain}
      </button>
    </div>
  )
}
