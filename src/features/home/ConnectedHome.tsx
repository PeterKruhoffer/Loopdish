import * as stylex from '@stylexjs/stylex'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import {
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react'
import { CalendarIcon, HeartIcon, SparklesIcon } from '~/components/ui/Icon'
import { Dishes } from '~/features/dishes/Dishes'
import { History } from '~/features/history/History'
import { Household } from '~/features/household/Household'
import { Suggestions } from '~/features/suggestions/Suggestions'
import { PlanDinner } from '~/features/week/PlanDinner'
import { WeekPlanner } from '~/features/week/WeekPlanner'
import { localDateKey, makeWeek } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'
import { AppHeader, BottomNav, Hero } from './AppChrome'
import { DashboardError, DashboardSkeleton } from './LoadingState'
import { dinnerDashboardQueryOptions, useDinnerDashboard } from './useDinnerDashboard'

const tablet = '@media (min-width: 720px)'
const display = 'Manrope, system-ui, sans-serif'

export type AppView = 'today' | 'week' | 'dishes' | 'suggestions' | 'household'

const styles = stylex.create({
  shell: {
    width: 'min(100% - 32px, 1080px)',
    margin: '0 auto',
    paddingBottom: 116,
    [tablet]: { width: 'min(100% - 64px, 1080px)', paddingBottom: 80 },
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
    [tablet]: { gridTemplateColumns: 'repeat(3, 1fr)' },
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
        <Link {...stylex.props(styles.firstRunAction)} to="/suggestions">
          <span {...stylex.props(styles.firstRunIcon)}>
            <SparklesIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.firstRunActionTitle)}>{t.aiSuggestions}</strong>
            <span {...stylex.props(styles.firstRunActionCopy)}>{t.suggestNewDishesCopy}</span>
          </span>
        </Link>
      </div>
    </section>
  )
}

function getLocalDay() {
  return localDateKey(new Date())
}

function subscribeToLocalDay(onDayChange: () => void) {
  let midnightTimer = 0

  function scheduleMidnightRefresh() {
    window.clearTimeout(midnightTimer)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setHours(24, 0, 0, 0)
    midnightTimer = window.setTimeout(refreshDay, tomorrow.getTime() - now.getTime() + 100)
  }

  function refreshDay() {
    onDayChange()
    scheduleMidnightRefresh()
  }

  function refreshVisibleDay() {
    if (!document.hidden) refreshDay()
  }

  scheduleMidnightRefresh()
  window.addEventListener('focus', refreshDay)
  document.addEventListener('visibilitychange', refreshVisibleDay)
  return () => {
    window.clearTimeout(midnightTimer)
    window.removeEventListener('focus', refreshDay)
    document.removeEventListener('visibilitychange', refreshVisibleDay)
  }
}

function useLocalDay() {
  return useSyncExternalStore(subscribeToLocalDay, getLocalDay, getLocalDay)
}

export function ConnectedHome({ view }: { view: AppView }) {
  const { signOut, user } = useAuth()
  const { language, t } = useI18n()
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedWeekOffset, setOptimisticWeekOffset] = useOptimistic(weekOffset)
  const [isWeekPending, startWeekAction] = useTransition()
  const weekRequest = useRef(0)
  const localDay = useLocalDay()
  const week = useMemo(
    () => makeWeek(language, weekOffset, new Date(`${localDay}T12:00:00`)),
    [language, localDay, weekOffset],
  )
  const suggestionWeek = useMemo(
    () => makeWeek(language, 1, new Date(`${localDay}T12:00:00`)),
    [language, localDay],
  )
  const dashboard = useDinnerDashboard(week)
  const data = dashboard.data

  function selectWeekAction(nextWeekOffset: number) {
    if (nextWeekOffset === selectedWeekOffset) return
    const request = ++weekRequest.current

    startWeekAction(async () => {
      setOptimisticWeekOffset(nextWeekOffset)
      const nextWeek = makeWeek(language, nextWeekOffset, new Date(`${localDay}T12:00:00`))
      try {
        await queryClient.ensureQueryData(dinnerDashboardQueryOptions(nextWeek))
      } catch {
        // Commit the selection so the existing inline query error can handle a failed preload.
      }
      if (request !== weekRequest.current) return
      startWeekAction(() => setWeekOffset(nextWeekOffset))
    })
  }

  return (
    <div {...stylex.props(styles.shell)}>
      <AppHeader name={user?.firstName} email={user?.email} householdName={data?.household?.name} />
      <main>
        {view === 'today' && (
          <>
            <Hero name={user?.firstName} />
            <FirstRunGuide />
          </>
        )}
        {view === 'week' ? (
          <>
            <WeekPlanner
              week={week}
              weekOffset={weekOffset}
              selectedWeekOffset={selectedWeekOffset}
              plans={data?.plannedMeals ?? []}
              selectedDate={dashboard.selectedDate}
              isWeekPending={isWeekPending}
              isPending={dashboard.isPending}
              queryError={dashboard.queryError}
              selectWeekAction={selectWeekAction}
              onSelectDate={dashboard.setSelectedDate}
              markEatenAction={dashboard.markEatenAction}
              removePlanAction={dashboard.removePlanAction}
              onRetry={dashboard.retryDashboard}
            />
            {!dashboard.isPending && !dashboard.queryError && (
              <PlanDinner
                dishes={data?.dishes ?? []}
                week={week}
                selectedDishId={dashboard.selectedDishId}
                selectedDate={dashboard.selectedDate}
                onSelectDish={dashboard.setSelectedDishId}
                onSelectDate={dashboard.setSelectedDate}
                planDinnerAction={dashboard.planDinnerAction}
              />
            )}
          </>
        ) : view === 'dishes' ? (
          dashboard.isPending ? (
            <DashboardSkeleton view="dishes" />
          ) : dashboard.queryError ? (
            <DashboardError message={t.dashboardLoadError} onRetry={dashboard.retryDashboard} />
          ) : (
            <>
              <Dishes dishes={data?.dishes ?? []} addDishAction={dashboard.addDishAction} />
              <History meals={data?.recentMeals ?? []} />
            </>
          )
        ) : view === 'household' ? (
          <Household
            signOutAction={async () => {
              await signOut()
            }}
          />
        ) : view === 'suggestions' ? (
          <Suggestions week={suggestionWeek} addDishAction={dashboard.addDishAction} />
        ) : null}
      </main>
      <BottomNav activeView={view} />
    </div>
  )
}
