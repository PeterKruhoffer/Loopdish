import { convexQuery } from '@convex-dev/react-query'
import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useMutation } from 'convex/react'
import { useMemo, useState, type FormEvent } from 'react'
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
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
  if (!convexUrl) return <SetupRequired />
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

function SetupRequired() {
  return (
    <main {...stylex.props(styles.setupShell)}>
      <div {...stylex.props(styles.setupCard)}>
        <Logo />
        <p {...stylex.props(styles.eyebrow, styles.setupEyebrow)}>One setup step left</p>
        <h1 {...stylex.props(styles.setupTitle)}>Connect LoopDish to Convex.</h1>
        <p {...stylex.props(styles.setupCopy)}>
          Run <code>pnpm dev</code> and complete the Convex project prompt. The CLI will create{' '}
          <code>.env.local</code> and reload this page.
        </p>
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
        <div {...stylex.props(styles.homeChip)}>
          <span {...stylex.props(styles.homeDot)} />
          <span>{user?.firstName || user?.email}</span>
          <button
            {...stylex.props(styles.bareButton, styles.signOutButton)}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      <main>
        <section {...stylex.props(styles.hero)}>
          <div>
            <p {...stylex.props(styles.eyebrow)}>Dinner, sorted</p>
            <h1 {...stylex.props(styles.heroTitle)}>What are we eating this week?</h1>
          </div>
          <p {...stylex.props(styles.heroCopy)}>
            Plan the week, remember the good ones, and stop having the same conversation at 5:30.
          </p>
        </section>

        {message ? (
          <p {...stylex.props(styles.status)} role="status" aria-live="polite">
            {message}
          </p>
        ) : null}

        <section aria-labelledby="week-heading">
          <div {...stylex.props(styles.sectionHeading)}>
            <div>
              <p {...stylex.props(styles.eyebrow)}>Plan</p>
              <h2 {...stylex.props(styles.sectionTitle)} id="week-heading">
                This week
              </h2>
            </div>
            <span {...stylex.props(styles.sectionMeta)}>
              {week[0].month} {week[0].dayNumber} – {week[6].month} {week[6].dayNumber}
            </span>
          </div>

          <div {...stylex.props(styles.weekGrid)}>
            {week.map((day) => {
              const plan = data?.plannedMeals.find((meal) => meal.date === day.date)
              return (
                <article
                  {...stylex.props(
                    styles.dayCard,
                    day.isToday && styles.today,
                    plan && styles.planned,
                  )}
                  key={day.date}
                >
                  <div {...stylex.props(styles.dayDate)}>
                    <span {...stylex.props(styles.weekday)}>{day.weekday}</span>
                    <strong {...stylex.props(styles.dayNumber)}>{day.dayNumber}</strong>
                  </div>
                  {plan ? (
                    <div {...stylex.props(styles.mealContent)}>
                      <p {...stylex.props(styles.mealName)}>{plan.dishName}</p>
                      {plan.completedAt ? (
                        <span {...stylex.props(styles.eatenLabel)}>Eaten</span>
                      ) : (
                        <div {...stylex.props(styles.mealActions)}>
                          <button
                            {...stylex.props(styles.bareButton, styles.textButton)}
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => markEaten({ planId: plan._id }),
                                'Added to dinner history.',
                              )
                            }
                          >
                            We ate this
                          </button>
                          <button
                            {...stylex.props(styles.bareButton, styles.iconButton)}
                            aria-label={`Remove ${plan.dishName} from ${day.weekday}`}
                            disabled={busy}
                            onClick={() =>
                              void run(() => removePlan({ planId: plan._id }), 'Plan removed.')
                            }
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      {...stylex.props(styles.bareButton, styles.emptyMeal)}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <span {...stylex.props(styles.plus)}>+</span> Add dinner
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <div {...stylex.props(styles.contentGrid)}>
          <section {...stylex.props(styles.panel, styles.planPanel)} aria-labelledby="plan-heading">
            <p {...stylex.props(styles.eyebrow, styles.eyebrowLight)}>Pick from your dishes</p>
            <h2 {...stylex.props(styles.sectionTitle)} id="plan-heading">
              Plan a dinner
            </h2>
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
                <button
                  {...stylex.props(styles.actionButton, styles.primaryButton)}
                  disabled={busy}
                >
                  Add to the week
                </button>
              </form>
            ) : (
              <p {...stylex.props(styles.emptyCopy)}>
                Add your first dish, then you can put it on the calendar.
              </p>
            )}
          </section>

          <section {...stylex.props(styles.panel)} aria-labelledby="dish-heading">
            <p {...stylex.props(styles.eyebrow)}>Build your rotation</p>
            <h2 {...stylex.props(styles.sectionTitle)} id="dish-heading">
              Add a dish
            </h2>
            <form {...stylex.props(styles.stackedForm)} onSubmit={handleAddDish}>
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
          </section>
        </div>

        <div {...stylex.props(styles.contentGrid, styles.lowerGrid)}>
          <section aria-labelledby="dishes-heading">
            <div {...stylex.props(styles.sectionHeading, styles.compactHeading)}>
              <div>
                <p {...stylex.props(styles.eyebrow)}>Your rotation</p>
                <h2 {...stylex.props(styles.sectionTitle)} id="dishes-heading">
                  Dishes
                </h2>
              </div>
              <span {...stylex.props(styles.sectionMeta)}>{data?.dishes.length ?? 0} saved</span>
            </div>
            <div {...stylex.props(styles.list)}>
              {data?.dishes.map((dish) => (
                <article {...stylex.props(styles.dishRow)} key={dish._id}>
                  <div>
                    <h3 {...stylex.props(styles.dishTitle)}>{dish.name}</h3>
                    {dish.notes ? <p {...stylex.props(styles.dishNotes)}>{dish.notes}</p> : null}
                  </div>
                  <p {...stylex.props(styles.dishStat)}>
                    {dish.lastEatenOn
                      ? `Last had ${friendlyDate(dish.lastEatenOn)}`
                      : 'Not logged yet'}
                  </p>
                </article>
              ))}
              {data && data.dishes.length === 0 ? (
                <p {...stylex.props(styles.emptyCopy, styles.listEmpty)}>
                  Spaghetti, tacos, takeout. Start with the dinners already in your regular
                  rotation.
                </p>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="history-heading">
            <div {...stylex.props(styles.sectionHeading, styles.compactHeading)}>
              <div>
                <p {...stylex.props(styles.eyebrow)}>Memory</p>
                <h2 {...stylex.props(styles.sectionTitle)} id="history-heading">
                  Recently eaten
                </h2>
              </div>
            </div>
            <div {...stylex.props(styles.list)}>
              {data?.recentMeals.map((meal) => (
                <div {...stylex.props(styles.historyRow)} key={meal._id}>
                  <span {...stylex.props(styles.historyMark)} />
                  <strong {...stylex.props(styles.historyName)}>{meal.dishName}</strong>
                  <span {...stylex.props(styles.historyDate)}>{friendlyDate(meal.eatenOn)}</span>
                </div>
              ))}
              {data && data.recentMeals.length === 0 ? (
                <p {...stylex.props(styles.emptyCopy, styles.listEmpty)}>
                  Completed dinners will show up here.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function Logo() {
  return (
    <div {...stylex.props(styles.logo)} aria-label="LoopDish">
      <span {...stylex.props(styles.logoMark)} aria-hidden="true">
        <span {...stylex.props(styles.logoMarkCenter)} />
      </span>
      <span>LoopDish</span>
    </div>
  )
}
