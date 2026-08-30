import { convexQuery } from '@convex-dev/react-query'
import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useMutation } from 'convex/react'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { styles } from '../styles/loopdish.stylex'

export const Route = createFileRoute('/')({
  ssr: false,
  component: Home,
})

type Day = {
  date: string
  weekday: string
  dayNumber: string
  month: string
  isToday: boolean
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeWeek(): Day[] {
  const today = new Date()
  const monday = new Date(today)
  const offset = (today.getDay() + 6) % 7
  monday.setDate(today.getDate() - offset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return {
      date: dateKey(date),
      weekday: date.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNumber: String(date.getDate()),
      month: date.toLocaleDateString(undefined, { month: 'short' }),
      isToday: dateKey(date) === dateKey(today),
    }
  })
}

function friendlyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong'
}

function Home() {
  return <AuthenticatedHome />
}

function AuthenticatedHome() {
  const { loading, user } = useAuth()
  if (loading) return <Loading />
  if (!user) return <SignInRequired />
  return <ConnectedHome />
}

function Loading() {
  return (
    <main {...stylex.props(styles.setupShell)}>
      <p {...stylex.props(styles.eyebrow)}>Loading LoopDish…</p>
    </main>
  )
}

function SignInRequired() {
  return (
    <main {...stylex.props(styles.setupShell)}>
      <div {...stylex.props(styles.setupCard)}>
        <Logo />
        <p {...stylex.props(styles.eyebrow, styles.setupEyebrow)}>Dinner, remembered</p>
        <h1 {...stylex.props(styles.setupTitle)}>Your dinner rotation starts here.</h1>
        <p {...stylex.props(styles.setupCopy)}>
          Sign in with Google to plan the week and keep your dinner history private.
        </p>
        <a {...stylex.props(styles.signInButton)} href="/api/auth/sign-in?returnPathname=/">
          Continue with Google
        </a>
      </div>
    </main>
  )
}

function ConnectedHome() {
  const { signOut, user } = useAuth()
  const week = useMemo(makeWeek, [])
  const [dishName, setDishName] = useState('')
  const [dishNotes, setDishNotes] = useState('')
  const [selectedDishId, setSelectedDishId] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    week.find((day) => day.isToday)?.date ?? week[0].date,
  )
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const dashboardQuery = useQuery(
    convexQuery(api.loopdish.dashboard, {
      startDate: week[0].date,
      endDate: week[week.length - 1].date,
    }),
  )
  const addDish = useMutation(api.loopdish.addDish)
  const planMeal = useMutation(api.loopdish.planMeal)
  const markEaten = useMutation(api.loopdish.markEaten)
  const removePlan = useMutation(api.loopdish.removePlan)

  const data = dashboardQuery.data
  const activeDishId = selectedDishId || data?.dishes[0]?._id || ''
  const selectedDay = week.find((day) => day.date === selectedDate) ?? week[0]
  const selectedPlan = data?.plannedMeals.find((meal) => meal.date === selectedDate)

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setMessage('')
    try {
      await action()
      setMessage(success)
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function handleAddDish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void run(async () => {
      const id = await addDish({
        name: dishName,
        notes: dishNotes || undefined,
      })
      setDishName('')
      setDishNotes('')
      setSelectedDishId(id)
    }, 'Dish added.')
  }

  function handlePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeDishId) return
    void run(
      () =>
        planMeal({
          dishId: activeDishId as Id<'dishes'>,
          date: selectedDate,
        }),
      `Dinner planned for ${friendlyDate(selectedDate)}.`,
    )
  }

  return (
    <div {...stylex.props(styles.appShell)}>
      <header {...stylex.props(styles.topbar)}>
        <Logo />
        <div {...stylex.props(styles.account)}>
          <button
            {...stylex.props(styles.avatar)}
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void signOut()}
          >
            {(user?.firstName || user?.email || 'M').slice(0, 1).toUpperCase()}
          </button>
          <button
            {...stylex.props(styles.bareButton, styles.signOutButton)}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      <main>
        <section {...stylex.props(styles.hero)} id="today">
          <span {...stylex.props(styles.sunDoodle)} aria-hidden="true">
            <Sun />
          </span>
          <p {...stylex.props(styles.greeting)}>Hey {user?.firstName || 'there'},</p>
          <h1 {...stylex.props(styles.heroTitle)}>What's for dinner?</h1>
          <p {...stylex.props(styles.heroCopy)}>A loose plan is still a plan.</p>
        </section>

        {message ? (
          <p {...stylex.props(styles.status)} role="status" aria-live="polite">
            {message}
          </p>
        ) : null}

        <section {...stylex.props(styles.weekSection)} aria-labelledby="week-heading" id="week">
          <div {...stylex.props(styles.sectionHeading)}>
            <h2 {...stylex.props(styles.sectionTitle)} id="week-heading">
              This week
            </h2>
            <span {...stylex.props(styles.sectionMeta)}>
              {week[0].month} {week[0].dayNumber}–{week[6].month} {week[6].dayNumber}
            </span>
          </div>

          <div {...stylex.props(styles.dayPills)}>
            {week.map((day) => {
              const hasPlan = data?.plannedMeals.some((meal) => meal.date === day.date)
              const isSelected = day.date === selectedDate
              return (
                <button
                  {...stylex.props(styles.dayPill, isSelected && styles.dayPillActive)}
                  key={day.date}
                  onClick={() => setSelectedDate(day.date)}
                  aria-pressed={isSelected}
                  aria-label={`${day.weekday}, ${day.month} ${day.dayNumber}`}
                >
                  <span {...stylex.props(styles.dayLetter)}>{day.weekday.slice(0, 1)}</span>
                  <strong {...stylex.props(styles.dayNumber, isSelected && styles.dayNumberActive)}>
                    {day.dayNumber}
                  </strong>
                  {hasPlan ? <i {...stylex.props(styles.planDot)} /> : null}
                </button>
              )
            })}
          </div>

          <article {...stylex.props(styles.dinnerCard, !selectedPlan && styles.emptyDinnerCard)}>
            <div {...stylex.props(styles.cardTopline)}>
              <span>
                {selectedDay.weekday}, {selectedDay.month} {selectedDay.dayNumber}
              </span>
              {selectedDay.isToday ? <span {...stylex.props(styles.todayLabel)}>Today</span> : null}
            </div>
            {selectedPlan ? (
              <>
                <div {...stylex.props(styles.foodDoodle)} aria-hidden="true">
                  <NoodleBowl />
                </div>
                <h3 {...stylex.props(styles.dinnerName)}>{selectedPlan.dishName}</h3>
                {selectedPlan.completedAt ? (
                  <span {...stylex.props(styles.eatenLabel)}>
                    <Check /> Added to history
                  </span>
                ) : (
                  <div {...stylex.props(styles.cardActions)}>
                    <button
                      {...stylex.props(styles.ateButton)}
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => markEaten({ planId: selectedPlan._id }),
                          'Added to dinner history.',
                        )
                      }
                    >
                      <Check /> We ate this
                    </button>
                    <button
                      {...stylex.props(styles.removeButton)}
                      aria-label={`Remove ${selectedPlan.dishName} from ${selectedDay.weekday}`}
                      disabled={busy}
                      onClick={() =>
                        void run(() => removePlan({ planId: selectedPlan._id }), 'Plan removed.')
                      }
                    >
                      Remove
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div {...stylex.props(styles.emptyDinner)}>
                <span {...stylex.props(styles.emptyPlate)} aria-hidden="true">
                  <Plus />
                </span>
                <h3 {...stylex.props(styles.emptyTitle)}>Nothing planned</h3>
                <p {...stylex.props(styles.emptyCardCopy)}>Maybe that's exactly right.</p>
                <a {...stylex.props(styles.pickDinnerButton)} href="#plan-dinner">
                  Pick a dinner
                </a>
              </div>
            )}
          </article>
        </section>

        <section
          {...stylex.props(styles.panel, styles.planPanel)}
          aria-labelledby="plan-heading"
          id="plan-dinner"
        >
          <div {...stylex.props(styles.panelHeading)}>
            <span {...stylex.props(styles.panelIcon)} aria-hidden="true">
              <Plus />
            </span>
            <div>
              <p {...stylex.props(styles.eyebrow, styles.eyebrowLight)}>Pick from your dishes</p>
              <h2 {...stylex.props(styles.sectionTitle)} id="plan-heading">
                Plan a dinner
              </h2>
            </div>
          </div>
          {data?.dishes.length ? (
            <form {...stylex.props(styles.stackedForm)} onSubmit={handlePlan}>
              <label {...stylex.props(styles.formLabel)}>
                Dish
                <select
                  {...stylex.props(styles.field, styles.planSelect)}
                  value={activeDishId}
                  onChange={(event) => setSelectedDishId(event.target.value)}
                >
                  {data.dishes.map((dish) => (
                    <option value={dish._id} key={dish._id}>
                      {dish.name}
                    </option>
                  ))}
                </select>
              </label>
              <label {...stylex.props(styles.formLabel)}>
                Day
                <select
                  {...stylex.props(styles.field, styles.planSelect)}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                >
                  {week.map((day) => (
                    <option value={day.date} key={day.date}>
                      {day.weekday}, {day.month} {day.dayNumber}
                    </option>
                  ))}
                </select>
              </label>
              <button {...stylex.props(styles.actionButton, styles.primaryButton)} disabled={busy}>
                Add to the week
              </button>
            </form>
          ) : (
            <p {...stylex.props(styles.emptyCopy)}>
              Add your first dish, then you can put it on the calendar.
            </p>
          )}
        </section>

        <section
          {...stylex.props(styles.dishesSection)}
          aria-labelledby="dishes-heading"
          id="dishes"
        >
          <div {...stylex.props(styles.sectionHeading)}>
            <h2 {...stylex.props(styles.sectionTitle)} id="dishes-heading">
              Your dishes
            </h2>
            <span {...stylex.props(styles.sectionMeta)}>{data?.dishes.length ?? 0} saved</span>
          </div>

          <div {...stylex.props(styles.dishCards)}>
            {data?.dishes.map((dish, index) => (
              <article
                {...stylex.props(styles.dishCard, index % 2 === 1 && styles.dishCardAlt)}
                key={dish._id}
              >
                <span {...stylex.props(styles.miniPlate)} aria-hidden="true">
                  <PlateMark />
                </span>
                <h3 {...stylex.props(styles.dishTitle)}>{dish.name}</h3>
                {dish.notes ? <p {...stylex.props(styles.dishNotes)}>{dish.notes}</p> : null}
                <p {...stylex.props(styles.dishStat)}>
                  {dish.lastEatenOn
                    ? `Last had ${friendlyDate(dish.lastEatenOn)}`
                    : 'Not tried yet'}
                </p>
              </article>
            ))}
          </div>

          {data && data.dishes.length === 0 ? (
            <p {...stylex.props(styles.emptyCopy)}>
              Spaghetti, tacos, takeout. Start with the dinners already in your rotation.
            </p>
          ) : null}

          <details {...stylex.props(styles.addDishDisclosure)}>
            <summary {...stylex.props(styles.addDishSummary)}>
              <Plus /> Add a new dish
            </summary>
            <form {...stylex.props(styles.addDishForm)} onSubmit={handleAddDish}>
              <label {...stylex.props(styles.formLabel)}>
                What do you call it?
                <input
                  {...stylex.props(styles.field)}
                  required
                  maxLength={80}
                  placeholder="Rotisserie chicken"
                  value={dishName}
                  onChange={(event) => setDishName(event.target.value)}
                />
              </label>
              <label {...stylex.props(styles.formLabel)}>
                Note <span {...stylex.props(styles.optional)}>optional</span>
                <input
                  {...stylex.props(styles.field)}
                  maxLength={160}
                  placeholder="Usually with salad and bread"
                  value={dishNotes}
                  onChange={(event) => setDishNotes(event.target.value)}
                />
              </label>
              <button
                {...stylex.props(styles.actionButton, styles.secondaryButton)}
                disabled={busy}
              >
                Save dish
              </button>
            </form>
          </details>
        </section>

        <section {...stylex.props(styles.historySection)} aria-labelledby="history-heading">
          <div {...stylex.props(styles.sectionHeading)}>
            <h2 {...stylex.props(styles.sectionTitle)} id="history-heading">
              Recently eaten
            </h2>
          </div>
          <div {...stylex.props(styles.historyList)}>
            {data?.recentMeals.map((meal) => (
              <div {...stylex.props(styles.historyRow)} key={meal._id}>
                <span {...stylex.props(styles.historyMark)}>
                  <Check />
                </span>
                <strong {...stylex.props(styles.historyName)}>{meal.dishName}</strong>
                <span {...stylex.props(styles.historyDate)}>{friendlyDate(meal.eatenOn)}</span>
              </div>
            ))}
            {data && data.recentMeals.length === 0 ? (
              <p {...stylex.props(styles.emptyCopy, styles.historyEmpty)}>
                Completed dinners will show up here.
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <nav {...stylex.props(styles.bottomNav)} aria-label="Main navigation">
        <a {...stylex.props(styles.navItem)} href="#today">
          <HomeIcon /> <span>Today</span>
        </a>
        <a {...stylex.props(styles.navItem)} href="#week">
          <Calendar /> <span>Week</span>
        </a>
        <a {...stylex.props(styles.navItem)} href="#dishes">
          <Heart /> <span>Dishes</span>
        </a>
      </nav>
    </div>
  )
}

function Logo() {
  return (
    <div {...stylex.props(styles.logo)} aria-label="LoopDish">
      <span {...stylex.props(styles.logoMark)} aria-hidden="true">
        <PlateMark />
      </span>
      <span>LoopDish</span>
    </div>
  )
}

function Icon({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  return (
    <svg
      {...stylex.props(styles.icon, fill && styles.iconFill)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function Calendar() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Icon>
  )
}

function Check() {
  return (
    <Icon>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  )
}

function Heart() {
  return (
    <Icon>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </Icon>
  )
}

function HomeIcon() {
  return (
    <Icon>
      <path d="m3 11 9-8 9 8v9H7v-6h10v6" />
    </Icon>
  )
}

function NoodleBowl() {
  return (
    <Icon fill>
      <path d="M4 10h16c0 6-3 9-8 9s-8-3-8-9Z" />
      <path d="M7 6c0-2 2-2 2-4M12 6c0-2 2-2 2-4M17 6c0-2 2-2 2-4M8 22h8" />
    </Icon>
  )
}

function PlateMark() {
  return (
    <Icon fill>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 7v10M16 7v10M8 12h8" />
    </Icon>
  )
}

function Plus() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

function Sun() {
  return (
    <Icon fill>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}
