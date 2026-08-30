import * as stylex from '@stylexjs/stylex'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useMemo } from 'react'
import { Dishes } from '~/features/dishes/Dishes'
import { History } from '~/features/history/History'
import { PlanDinner } from '~/features/week/PlanDinner'
import { WeekPlanner } from '~/features/week/WeekPlanner'
import { makeWeek } from '~/lib/dates'
import { AppHeader, BottomNav, Hero } from './AppChrome'
import { useDinnerDashboard } from './useDinnerDashboard'

const tablet = '@media (min-width: 720px)'

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
})

function StatusMessage({ message }: { message: string }) {
  if (!message) return null
  return (
    <p {...stylex.props(styles.status)} role="status" aria-live="polite">
      {message}
    </p>
  )
}

export function ConnectedHome() {
  const { signOut, user } = useAuth()
  const week = useMemo(makeWeek, [])
  const dashboard = useDinnerDashboard(week)
  const data = dashboard.data

  return (
    <div {...stylex.props(styles.shell)}>
      <AppHeader name={user?.firstName} email={user?.email} onSignOut={() => void signOut()} />
      <main>
        <Hero name={user?.firstName} />
        <StatusMessage message={dashboard.message} />
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
        <Dishes dishes={data?.dishes ?? []} busy={dashboard.busy} onAdd={dashboard.addDish} />
        <History meals={data?.recentMeals ?? []} />
      </main>
      <BottomNav />
    </div>
  )
}
