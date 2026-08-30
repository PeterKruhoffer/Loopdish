import * as stylex from '@stylexjs/stylex'
import { useAction, useMutation } from 'convex/react'
import { useState } from 'react'
import { api } from '../../../convex/_generated/api'
import { CheckIcon, PlusIcon, SparklesIcon } from '~/components/ui/Icon'
import { SectionHeading } from '~/components/ui/SectionHeading'
import type { Day } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

type DishSuggestion = { name: string; notes: string; reason: string }
type MealSuggestion = DishSuggestion & { date: string }

const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'
const display = 'Manrope, system-ui, sans-serif'

const styles = stylex.create({
  section: { marginTop: 48, [tablet]: { marginTop: 72 } },
  intro: {
    maxWidth: 650,
    margin: '-4px 0 22px',
    color: colors.muted,
    fontSize: 13,
    lineHeight: 1.6,
  },
  choices: { display: 'grid', gap: 12, [tablet]: { gridTemplateColumns: '1fr 1fr' } },
  choice: {
    display: 'grid',
    minHeight: 170,
    alignContent: 'space-between',
    gap: 28,
    padding: 20,
    border: 0,
    borderRadius: 24,
    color: colors.ink,
    backgroundColor: '#f5d8a8',
    textAlign: 'left',
    [motion]: { transition: 'transform 150ms ease, background-color 150ms ease' },
    ':hover': { backgroundColor: '#f0cd94', transform: 'translateY(-2px)' },
  },
  choiceAlt: { backgroundColor: colors.mint, ':hover': { backgroundColor: '#d2e4d7' } },
  choiceIcon: {
    display: 'grid',
    width: 42,
    height: 42,
    placeItems: 'center',
    borderRadius: '50%',
    color: '#fff',
    backgroundColor: colors.green,
  },
  choiceTitle: { display: 'block', fontFamily: display, fontSize: 20, letterSpacing: '-0.035em' },
  choiceCopy: {
    display: 'block',
    maxWidth: 360,
    marginTop: 6,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 1.45,
  },
  status: {
    marginTop: 16,
    padding: '12px 14px',
    borderRadius: 13,
    color: '#633a2e',
    backgroundColor: '#f8d9ce',
    fontSize: 12,
  },
  results: { marginTop: 32 },
  resultHeader: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 12,
  },
  resultTitle: { fontFamily: display, fontSize: 19, letterSpacing: '-0.035em' },
  resultMeta: { color: colors.muted, fontSize: 10 },
  list: { display: 'grid', gap: 9, margin: 0, padding: 0, listStyle: 'none' },
  item: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 14,
    alignItems: 'center',
    padding: 16,
    border: `1px solid ${colors.line}`,
    borderRadius: 18,
    backgroundColor: 'rgb(255 254 249 / 76%)',
  },
  day: {
    marginBottom: 3,
    color: colors.coral,
    fontSize: 9,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  itemTitle: { fontFamily: display, fontSize: 15, letterSpacing: '-0.025em' },
  notes: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 1.4 },
  reason: { marginTop: 7, color: '#657068', fontSize: 10, fontStyle: 'italic', lineHeight: 1.4 },
  addButton: {
    display: 'inline-flex',
    minHeight: 38,
    alignItems: 'center',
    gap: 5,
    padding: '0 12px',
    border: 0,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 10,
    fontWeight: 800,
  },
  saved: { color: colors.green, backgroundColor: colors.mint },
  confirm: {
    width: '100%',
    minHeight: 48,
    marginTop: 13,
    border: 0,
    borderRadius: 14,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 12,
    fontWeight: 800,
  },
  disclosure: { marginTop: 9, color: colors.muted, fontSize: 10, lineHeight: 1.45 },
})

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function Suggestions({
  week,
  busy,
  onAddDish,
}: {
  week: Day[]
  busy: boolean
  onAddDish: (name: string, notes?: string) => Promise<boolean>
}) {
  const { language, t } = useI18n()
  const generate = useAction(api.suggestions.generate)
  const applyPlan = useMutation(api.mealPlans.applySuggestion)
  const [generating, setGenerating] = useState<'new_dishes' | 'weekly_plan' | null>(null)
  const [applying, setApplying] = useState(false)
  const [dishes, setDishes] = useState<DishSuggestion[]>([])
  const [meals, setMeals] = useState<MealSuggestion[]>([])
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')

  async function request(kind: 'new_dishes' | 'weekly_plan') {
    setGenerating(kind)
    setMessage('')
    try {
      const result = await generate({
        kind,
        startDate: week[0].date,
        endDate: week[6].date,
        language,
      })
      if (result.kind === 'new_dishes') {
        setDishes(result.dishes)
        setMeals([])
        setSaved(new Set())
      } else {
        setMeals(result.meals)
        setDishes([])
      }
    } catch (error) {
      setMessage(errorMessage(error, t.suggestionsError))
    } finally {
      setGenerating(null)
    }
  }

  async function saveDish(dish: DishSuggestion) {
    if (await onAddDish(dish.name, dish.notes)) {
      setSaved((current) => new Set(current).add(dish.name))
    }
  }

  async function confirmPlan() {
    setApplying(true)
    setMessage('')
    try {
      const result = await applyPlan({
        meals: meals.map(({ date, name, notes }) => ({ date, name, notes })),
      })
      setMessage(result.preservedDates.length > 0 ? t.planAppliedWithCompleted : t.planApplied)
    } catch (error) {
      setMessage(errorMessage(error, t.suggestionsError))
    } finally {
      setApplying(false)
    }
  }

  const disabled = busy || Boolean(generating) || applying

  return (
    <section {...stylex.props(styles.section)} aria-labelledby="suggestions-heading">
      <SectionHeading
        id="suggestions-heading"
        title={t.aiSuggestions}
        meta={t.poweredByCloudflare}
      />
      <p {...stylex.props(styles.intro)}>{t.suggestionsIntro}</p>

      <div {...stylex.props(styles.choices)}>
        <button
          {...stylex.props(styles.choice)}
          disabled={disabled}
          onClick={() => void request('new_dishes')}
        >
          <span {...stylex.props(styles.choiceIcon)}>
            <SparklesIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.choiceTitle)}>
              {generating === 'new_dishes' ? t.thinking : t.suggestNewDishes}
            </strong>
            <span {...stylex.props(styles.choiceCopy)}>{t.suggestNewDishesCopy}</span>
          </span>
        </button>
        <button
          {...stylex.props(styles.choice, styles.choiceAlt)}
          disabled={disabled}
          onClick={() => void request('weekly_plan')}
        >
          <span {...stylex.props(styles.choiceIcon)}>
            <SparklesIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.choiceTitle)}>
              {generating === 'weekly_plan' ? t.thinking : t.planNextWeek}
            </strong>
            <span {...stylex.props(styles.choiceCopy)}>{t.planNextWeekCopy}</span>
          </span>
        </button>
      </div>

      {message && (
        <p {...stylex.props(styles.status)} role="status" aria-live="polite">
          {message}
        </p>
      )}

      {dishes.length > 0 && (
        <div {...stylex.props(styles.results)}>
          <div {...stylex.props(styles.resultHeader)}>
            <h2 {...stylex.props(styles.resultTitle)}>{t.dishesToTry}</h2>
            <span {...stylex.props(styles.resultMeta)}>{t.addTheOnesYouLike}</span>
          </div>
          <ul {...stylex.props(styles.list)}>
            {dishes.map((dish) => {
              const isSaved = saved.has(dish.name)
              return (
                <li {...stylex.props(styles.item)} key={dish.name}>
                  <div>
                    <h3 {...stylex.props(styles.itemTitle)}>{dish.name}</h3>
                    <p {...stylex.props(styles.notes)}>{dish.notes}</p>
                    <p {...stylex.props(styles.reason)}>{dish.reason}</p>
                  </div>
                  <button
                    {...stylex.props(styles.addButton, isSaved && styles.saved)}
                    disabled={disabled || isSaved}
                    onClick={() => void saveDish(dish)}
                  >
                    {isSaved ? (
                      <>
                        <CheckIcon /> {t.savedDish}
                      </>
                    ) : (
                      <>
                        <PlusIcon /> {t.add}
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {meals.length > 0 && (
        <div {...stylex.props(styles.results)}>
          <div {...stylex.props(styles.resultHeader)}>
            <h2 {...stylex.props(styles.resultTitle)}>{t.nextWeeksPlan}</h2>
            <span {...stylex.props(styles.resultMeta)}>
              {week[0].month} {week[0].dayNumber}–{week[6].month} {week[6].dayNumber}
            </span>
          </div>
          <ul {...stylex.props(styles.list)}>
            {meals.map((meal) => (
              <li {...stylex.props(styles.item)} key={meal.date}>
                <div>
                  <p {...stylex.props(styles.day)}>
                    {week.find((day) => day.date === meal.date)?.weekday}
                  </p>
                  <h3 {...stylex.props(styles.itemTitle)}>{meal.name}</h3>
                  <p {...stylex.props(styles.notes)}>{meal.notes}</p>
                  <p {...stylex.props(styles.reason)}>{meal.reason}</p>
                </div>
              </li>
            ))}
          </ul>
          <button
            {...stylex.props(styles.confirm)}
            disabled={disabled}
            onClick={() => void confirmPlan()}
          >
            {applying ? t.savingPlan : t.useThisPlan}
          </button>
          <p {...stylex.props(styles.disclosure)}>{t.planDisclosure}</p>
        </div>
      )}
    </section>
  )
}
