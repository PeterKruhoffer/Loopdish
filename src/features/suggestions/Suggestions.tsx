import * as stylex from '@stylexjs/stylex'
import { useAction, useMutation } from 'convex/react'
import { startTransition, useActionState, useOptimistic } from 'react'
import { api } from '../../../convex/_generated/api'
import { CheckIcon, PlusIcon, SparklesIcon } from '~/components/ui/Icon'
import { SectionHeading } from '~/components/ui/SectionHeading'
import type { Day } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

type DishSuggestion = { name: string; notes: string; reason: string }
type MealSuggestion = DishSuggestion & { date: string }
type SuggestionKind = 'new_dishes' | 'weekly_plan'

type SuggestionState = {
  dishes: DishSuggestion[]
  meals: MealSuggestion[]
  message: string
}

type SavedDishState = {
  names: Set<string>
  message: string
}

const initialSuggestions: SuggestionState = { dishes: [], meals: [], message: '' }
const initialSavedDishes: SavedDishState = { names: new Set(), message: '' }

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
  addDishAction,
}: {
  week: Day[]
  addDishAction: (name: string, notes?: string) => Promise<void>
}) {
  const { language, t } = useI18n()
  const generate = useAction(api.suggestions.generate)
  const applyPlan = useMutation(api.mealPlans.applySuggestion)
  const [suggestions, generateAction, isGenerating] = useActionState(
    async (current: SuggestionState, kind: SuggestionKind): Promise<SuggestionState> => {
      try {
        const result = await generate({
          kind,
          startDate: week[0].date,
          endDate: week[6].date,
          language,
        })
        return result.kind === 'new_dishes'
          ? { dishes: result.dishes, meals: [], message: '' }
          : { dishes: [], meals: result.meals, message: '' }
      } catch (error) {
        return { ...current, message: errorMessage(error, t.suggestionsError) }
      }
    },
    initialSuggestions,
  )
  const [generatingKind, setOptimisticGeneratingKind] = useOptimistic<SuggestionKind | null>(null)
  const [savedDishes, saveDishAction, isSavingDish] = useActionState(
    async (current: SavedDishState, dish: DishSuggestion): Promise<SavedDishState> => {
      try {
        await addDishAction(dish.name, dish.notes)
        return { names: new Set(current.names).add(dish.name), message: '' }
      } catch (error) {
        return { ...current, message: errorMessage(error, t.suggestionsError) }
      }
    },
    initialSavedDishes,
  )
  const [optimisticSavedNames, setOptimisticSavedName] = useOptimistic(
    savedDishes.names,
    (currentNames, name: string) => new Set(currentNames).add(name),
  )
  const [planMessage, applyPlanAction, isApplyingPlan] = useActionState(
    async (_current: string, meals: MealSuggestion[]) => {
      try {
        const result = await applyPlan({
          meals: meals.map(({ date, name, notes }) => ({ date, name, notes })),
        })
        return result.preservedDates.length > 0 ? t.planAppliedWithCompleted : t.planApplied
      } catch (error) {
        return errorMessage(error, t.suggestionsError)
      }
    },
    '',
  )

  function requestSuggestions(kind: SuggestionKind) {
    startTransition(() => {
      setOptimisticGeneratingKind(kind)
      generateAction(kind)
    })
  }

  function saveSuggestedDish(dish: DishSuggestion) {
    startTransition(() => {
      setOptimisticSavedName(dish.name)
      saveDishAction(dish)
    })
  }

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
          disabled={isGenerating || isApplyingPlan}
          onClick={() => requestSuggestions('new_dishes')}
        >
          <span {...stylex.props(styles.choiceIcon)}>
            <SparklesIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.choiceTitle)}>
              {generatingKind === 'new_dishes' ? t.thinking : t.suggestNewDishes}
            </strong>
            <span {...stylex.props(styles.choiceCopy)}>{t.suggestNewDishesCopy}</span>
          </span>
        </button>
        <button
          {...stylex.props(styles.choice, styles.choiceAlt)}
          disabled={isGenerating || isApplyingPlan}
          onClick={() => requestSuggestions('weekly_plan')}
        >
          <span {...stylex.props(styles.choiceIcon)}>
            <SparklesIcon />
          </span>
          <span>
            <strong {...stylex.props(styles.choiceTitle)}>
              {generatingKind === 'weekly_plan' ? t.thinking : t.planNextWeek}
            </strong>
            <span {...stylex.props(styles.choiceCopy)}>{t.planNextWeekCopy}</span>
          </span>
        </button>
      </div>

      {suggestions.message && (
        <p {...stylex.props(styles.status)} role="status" aria-live="polite">
          {suggestions.message}
        </p>
      )}

      {suggestions.dishes.length > 0 && (
        <div {...stylex.props(styles.results)}>
          <div {...stylex.props(styles.resultHeader)}>
            <h2 {...stylex.props(styles.resultTitle)}>{t.dishesToTry}</h2>
            <span {...stylex.props(styles.resultMeta)}>{t.addTheOnesYouLike}</span>
          </div>
          <ul {...stylex.props(styles.list)}>
            {suggestions.dishes.map((dish) => {
              const isSaved = optimisticSavedNames.has(dish.name)
              return (
                <li {...stylex.props(styles.item)} key={dish.name}>
                  <div>
                    <h3 {...stylex.props(styles.itemTitle)}>{dish.name}</h3>
                    <p {...stylex.props(styles.notes)}>{dish.notes}</p>
                    <p {...stylex.props(styles.reason)}>{dish.reason}</p>
                  </div>
                  <button
                    {...stylex.props(styles.addButton, isSaved && styles.saved)}
                    disabled={isSavingDish || isSaved}
                    onClick={() => saveSuggestedDish(dish)}
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
          {savedDishes.message && (
            <p {...stylex.props(styles.status)} role="status" aria-live="polite">
              {savedDishes.message}
            </p>
          )}
        </div>
      )}

      {suggestions.meals.length > 0 && (
        <div {...stylex.props(styles.results)}>
          <div {...stylex.props(styles.resultHeader)}>
            <h2 {...stylex.props(styles.resultTitle)}>{t.nextWeeksPlan}</h2>
            <span {...stylex.props(styles.resultMeta)}>
              {week[0].month} {week[0].dayNumber}–{week[6].month} {week[6].dayNumber}
            </span>
          </div>
          <ul {...stylex.props(styles.list)}>
            {suggestions.meals.map((meal) => (
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
            disabled={isGenerating || isApplyingPlan}
            onClick={() => startTransition(() => applyPlanAction(suggestions.meals))}
          >
            {isApplyingPlan ? t.savingPlan : t.useThisPlan}
          </button>
          <p {...stylex.props(styles.disclosure)}>{t.planDisclosure}</p>
          {planMessage && (
            <p {...stylex.props(styles.status)} role="status" aria-live="polite">
              {planMessage}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
