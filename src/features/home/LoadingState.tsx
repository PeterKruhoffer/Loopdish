import * as stylex from '@stylexjs/stylex'
import { useI18n } from '~/lib/i18n'

const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'

const skeletonShimmer = stylex.keyframes({
  from: { backgroundPosition: '180% 0' },
  to: { backgroundPosition: '-80% 0' },
})

const styles = stylex.create({
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
})

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
