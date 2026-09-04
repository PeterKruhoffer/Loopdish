import * as stylex from '@stylexjs/stylex'
import { useAction, useMutation } from 'convex/react'
import { startTransition, useActionState, useOptimistic, type ReactNode } from 'react'
import { api } from '../../../convex/_generated/api'
import { CheckIcon, PlusIcon, SparklesIcon } from '~/components/ui/Icon'
import type { Day } from '~/lib/dates'
import { userErrorMessage } from '~/lib/errors'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

type DishSuggestion = { name: string; notes: string; reason: string }
type MealSuggestion = DishSuggestion & { date: string }

type SavedDishState = {
  names: Set<string>
  message: string
}

const initialSavedDishes: SavedDishState = { names: new Set(), message: '' }

const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'
const display = 'Manrope, system-ui, sans-serif'

const styles = stylex.create({
  section: { marginTop: 24, [tablet]: { marginTop: 30 } },
  prompt: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '15px 16px',
    border: `1px solid ${colors.line}`,
    borderRadius: 17,
    backgroundColor: 'rgb(255 254 249 / 72%)',
  },
  promptCopy: { maxWidth: 560, color: colors.muted, fontSize: 11, lineHeight: 1.45 },
  generateButton: {
    display: 'inline-flex',
    minHeight: 40,
    flexShrink: 0,
    alignItems: 'center',
    gap: 7,
    padding: '0 14px',
    border: 0,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 11,
    fontWeight: 800,
    [motion]: { transition: 'transform 140ms ease, background-color 140ms ease' },
    ':hover': { backgroundColor: '#3b5048' },
    ':active': { transform: 'translateY(1px)' },
  },
  status: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 11,
    color: '#633a2e',
    backgroundColor: '#f8d9ce',
    fontSize: 12,
  },
  results: { marginTop: 24 },
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

function SuggestionPrompt({
  copy,
  button,
  pending,
}: {
  copy: string
  button: string
  pending: boolean
}) {
  return (
    <div {...stylex.props(styles.prompt)}>
      <p {...stylex.props(styles.promptCopy)}>{copy}</p>
      <button {...stylex.props(styles.generateButton)} disabled={pending} type="submit">
        <SparklesIcon /> {button}
      </button>
    </div>
  )
}

function Status({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p {...stylex.props(styles.status)} role="status" aria-live="polite">
      {children}
    </p>
  )
}

export function DishSuggestions({
  week,
  addDishAction,
}: {
  week: Day[]
  addDishAction: (name: string, notes?: string) => Promise<void>
}) {
  const { language, t } = useI18n()
  const generate = useAction(api.suggestions.generate)
  const [suggestions, generateAction, isGenerating] = useActionState(
    async (current: { dishes: DishSuggestion[]; message: string }) => {
      try {
        const result = await generate({
          kind: 'new_dishes',
          startDate: week[0].date,
          endDate: week[6].date,
          language,
        })
        return result.kind === 'new_dishes' ? { dishes: result.dishes, message: '' } : current
      } catch (error) {
        return { ...current, message: userErrorMessage(error, language, t.suggestionsError) }
      }
    },
    { dishes: [], message: '' },
  )
  const [savedDishes, saveDishAction, isSavingDish] = useActionState(
    async (current: SavedDishState, dish: DishSuggestion): Promise<SavedDishState> => {
      try {
        await addDishAction(dish.name, dish.notes)
        return { names: new Set(current.names).add(dish.name), message: '' }
      } catch (error) {
        return { ...current, message: userErrorMessage(error, language, t.saveSuggestionError) }
      }
    },
    initialSavedDishes,
  )
  const [optimisticSavedNames, setOptimisticSavedName] = useOptimistic(
    savedDishes.names,
    (currentNames, name: string) => new Set(currentNames).add(name),
  )

  function saveSuggestedDish(dish: DishSuggestion) {
    startTransition(() => {
      setOptimisticSavedName(dish.name)
      saveDishAction(dish)
    })
  }

  return (
    <section {...stylex.props(styles.section)} aria-label={t.getSuggestions}>
      <form action={generateAction}>
        <SuggestionPrompt
          copy={t.dishSuggestionsCopy}
          button={isGenerating ? t.thinking : t.getSuggestions}
          pending={isGenerating}
        />
      </form>
      <Status>{suggestions.message}</Status>

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
          <Status>{savedDishes.message}</Status>
        </div>
      )}
    </section>
  )
}

export function WeekSuggestions({ week }: { week: Day[] }) {
  const { language, t } = useI18n()
  const generate = useAction(api.suggestions.generate)
  const applyPlan = useMutation(api.mealPlans.applySuggestion)
  const [suggestions, generateAction, isGenerating] = useActionState(
    async (current: { meals: MealSuggestion[]; message: string }) => {
      try {
        const result = await generate({
          kind: 'weekly_plan',
          startDate: week[0].date,
          endDate: week[6].date,
          language,
        })
        return result.kind === 'weekly_plan' ? { meals: result.meals, message: '' } : current
      } catch (error) {
        return { ...current, message: userErrorMessage(error, language, t.suggestionsError) }
      }
    },
    { meals: [], message: '' },
  )
  const [planMessage, applyPlanAction, isApplyingPlan] = useActionState(
    async (_current: string, meals: MealSuggestion[]) => {
      try {
        const result = await applyPlan({
          meals: meals.map(({ date, name, notes }) => ({ date, name, notes })),
        })
        return result.preservedDates.length > 0 ? t.planAppliedWithCompleted : t.planApplied
      } catch (error) {
        return userErrorMessage(error, language, t.applySuggestionError)
      }
    },
    '',
  )

  return (
    <section {...stylex.props(styles.section)} aria-label={t.suggestAPlan}>
      <form action={generateAction}>
        <SuggestionPrompt
          copy={t.weekSuggestionsCopy}
          button={isGenerating ? t.thinking : t.suggestAPlan}
          pending={isGenerating || isApplyingPlan}
        />
      </form>
      <Status>{suggestions.message}</Status>

      {suggestions.meals.length > 0 && (
        <div {...stylex.props(styles.results)}>
          <div {...stylex.props(styles.resultHeader)}>
            <h2 {...stylex.props(styles.resultTitle)}>{t.suggestedPlan}</h2>
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
          <Status>{planMessage}</Status>
        </div>
      )}
    </section>
  )
}
