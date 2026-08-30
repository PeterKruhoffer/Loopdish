import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useMemo } from 'react'
import { CalendarIcon, HeartIcon } from '~/components/ui/Icon'
import { Dishes } from '~/features/dishes/Dishes'
import { History } from '~/features/history/History'
import { Household } from '~/features/household/Household'
import { PlanDinner } from '~/features/week/PlanDinner'
import { WeekPlanner } from '~/features/week/WeekPlanner'
import { makeWeek } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'
import { AppHeader, BottomNav, Hero } from './AppChrome'
import { DashboardSkeleton, NavigationShimmer } from './LoadingState'
import { useDinnerDashboard } from './useDinnerDashboard'

const tablet = '@media (min-width: 720px)'
const display = 'Manrope, system-ui, sans-serif'

export type AppView = 'today' | 'week' | 'dishes' | 'household'

const styles = stylex.create({
  shell: {
    width: 'min(100% - 32px, 1080px)',
    margin: '0 auto',
    paddingBottom: 116,
    [tablet]: { width: 'min(100% - 64px, 1080px)', paddingBottom: 80 },
  },
  status: {
    margin: '-16px 0 26px',
    padding: '11px 14px',
    borderRadius: 12,
    color: '#633a2e',
    backgroundColor: '#f8d9ce',
    fontSize: 13,
  },
  firstRun: {
    marginTop: 10,
    padding: 22,
    border: `1px solid ${colors.line}`,
    borderRadius: 28,
    backgroundColor: 'rgb(255 254 249 / 72%)',
    boxShadow: '0 14px 32px rgb(73 58 39 / 8%)',
    [tablet]: { maxWidth: 720, padding: 30 },
  },
  firstRunEyebrow: {
    color: colors.coral,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  firstRunTitle: {
    maxWidth: 480,
    marginTop: 7,
    fontFamily: display,
    fontSize: 25,
    lineHeight: 1.05,
    letterSpacing: '-0.045em',
    [tablet]: { fontSize: 32 },
  },
  firstRunCopy: {
    maxWidth: 520,
    marginTop: 10,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 1.55,
  },
  firstRunActions: {
    display: 'grid',
    gap: 10,
    marginTop: 20,
    [tablet]: { gridTemplateColumns: '1fr 1fr' },
  },
  firstRunAction: {
    display: 'grid',
    minHeight: 92,
    gridTemplateColumns: '38px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    color: colors.ink,
    backgroundColor: '#f5d8a8',
    textDecoration: 'none',
    ':hover': { backgroundColor: '#f0cd94' },
  },
  firstRunActionAlt: {
    backgroundColor: colors.mint,
    ':hover': { backgroundColor: '#d2e4d7' },
  },
  firstRunIcon: {
    display: 'grid',
    width: 38,
    height: 38,
    placeItems: 'center',
    borderRadius: '50%',
    color: '#fff',
    backgroundColor: colors.green,
  },
  firstRunActionTitle: { display: 'block', fontSize: 13, fontWeight: 800 },
  firstRunActionCopy: {
    display: 'block',
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 1.4,
  },
})

function StatusMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p {...stylex.props(styles.status)} role="status" aria-live="polite">
      {message}
    </p>
  )
}

function FirstRunGuide() {
  const { t } = useI18n()

  return (
    <section {...stylex.props(styles.firstRun)} aria-labelledby="first-run-heading">
      <p {...stylex.props(styles.firstRunEyebrow)}>{t.firstRunEyebrow}</p>
      <h2 {...stylex.props(styles.firstRunTitle)} id="first-run-heading">
        {t.firstRunTitle}
      </h2>
      <p {...stylex.props(styles.firstRunCopy)}>{t.firstRunCopy}</p>
      <div {...stylex.props(styles.firstRunActions)}>
        <Link {...stylex.props(styles.firstRunAction)} to="/dishes">
          <span {...stylex.props(styles.firstRunIcon)}>
            <HeartIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.firstRunActionTitle)}>{t.firstRunDishesTitle}</strong>
            <span {...stylex.props(styles.firstRunActionCopy)}>{t.firstRunDishesCopy}</span>
          </span>
        </Link>
        <Link {...stylex.props(styles.firstRunAction, styles.firstRunActionAlt)} to="/week">
          <span {...stylex.props(styles.firstRunIcon)}>
            <CalendarIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.firstRunActionTitle)}>{t.firstRunWeekTitle}</strong>
            <span {...stylex.props(styles.firstRunActionCopy)}>{t.firstRunWeekCopy}</span>
          </span>
        </Link>
      </div>
    </section>
  )
}

export function ConnectedHome({ view }: { view: AppView }) {
  const { signOut, user } = useAuth()
  const { language } = useI18n()
  const week = useMemo(() => makeWeek(language), [language])
  const dashboard = useDinnerDashboard(week)
  const data = dashboard.data

  return (
    <div {...stylex.props(styles.shell)}>
      <NavigationShimmer />
      <AppHeader name={user?.firstName} email={user?.email} householdName={data?.household?.name} />
      <main>
        {view === 'today' && (
          <>
            <Hero name={user?.firstName} />
            <FirstRunGuide />
          </>
        )}
        <StatusMessage message={dashboard.message} />
        {(view === 'week' || view === 'dishes') && dashboard.isPending ? (
          <DashboardSkeleton view={view} />
        ) : view === 'week' ? (
          <>
            <WeekPlanner
              week={week}
              plans={data?.plannedMeals ?? []}
              selectedDate={dashboard.selectedDate}
              busy={dashboard.busy}
              onSelectDate={dashboard.setSelectedDate}
              onMarkEaten={dashboard.markEaten}
              onRemove={dashboard.removePlan}
            />
            <PlanDinner
              dishes={data?.dishes ?? []}
              week={week}
              selectedDishId={dashboard.selectedDishId}
              selectedDate={dashboard.selectedDate}
              busy={dashboard.busy}
              onSelectDish={dashboard.setSelectedDishId}
              onSelectDate={dashboard.setSelectedDate}
              onPlan={dashboard.planDinner}
            />
          </>
        ) : view === 'dishes' ? (
          <>
            <Dishes dishes={data?.dishes ?? []} busy={dashboard.busy} onAdd={dashboard.addDish} />
            <History meals={data?.recentMeals ?? []} />
          </>
        ) : view === 'household' ? (
          <Household onSignOut={() => void signOut()} />
        ) : null}
      </main>
      <BottomNav activeView={view} />
    </div>
  )
}
