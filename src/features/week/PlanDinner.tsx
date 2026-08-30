import * as stylex from '@stylexjs/stylex'
import { PlusIcon } from '~/components/ui/Icon'
import type { Dish } from '~/features/home/types'
import type { Day } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'

const styles = stylex.create({
  panel: {
    marginTop: 38,
    padding: 22,
    scrollMarginTop: 20,
    borderRadius: 26,
    color: colors.cream,
    backgroundColor: colors.green,
    [tablet]: { marginTop: 54, padding: 30 },
  },
  heading: { display: 'flex', alignItems: 'center', gap: 13 },
  icon: {
    display: 'grid',
    width: 42,
    height: 42,
    flex: '0 0 42px',
    placeItems: 'center',
    borderRadius: '50%',
    color: colors.green,
    backgroundColor: colors.yellow,
  },
  eyebrow: {
    marginBottom: 5,
    color: '#bbd7c1',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: display,
    fontSize: 21,
    lineHeight: 1.1,
    letterSpacing: '-0.04em',
    [tablet]: { fontSize: 25 },
  },
  form: {
    display: 'grid',
    gap: 13,
    marginTop: 22,
    [tablet]: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto', alignItems: 'end' },
  },
  label: { display: 'grid', gap: 7, fontSize: 11, fontWeight: 800 },
  select: {
    width: '100%',
    height: 47,
    padding: '0 13px',
    border: '1px solid rgb(255 255 255 / 22%)',
    borderRadius: 13,
    color: colors.ink,
    backgroundColor: colors.cream,
    fontSize: 13,
  },
  button: {
    minHeight: 47,
    padding: '0 18px',
    border: 0,
    borderRadius: 13,
    color: '#4a271b',
    backgroundColor: colors.coralSoft,
    fontSize: 12,
    fontWeight: 800,
    [motion]: { transition: 'transform 140ms ease, background-color 140ms ease' },
    ':hover': { backgroundColor: '#f7ae9d' },
    ':active': { transform: 'translateY(1px)' },
  },
  empty: { maxWidth: 440, marginTop: 16, color: colors.muted, fontSize: 13, lineHeight: 1.55 },
})

type PlanDinnerFormProps = {
  dishes: Dish[]
  week: Day[]
  selectedDishId: string
  selectedDate: string
  busy: boolean
  onSelectDish: (dishId: string) => void
  onSelectDate: (date: string) => void
  onPlan: () => void
}

function PlanDinnerForm({
  dishes,
  week,
  selectedDishId,
  selectedDate,
  busy,
  onSelectDish,
  onSelectDate,
  onPlan,
}: PlanDinnerFormProps) {
  const { t } = useI18n()
  if (dishes.length === 0) {
    return <p {...stylex.props(styles.empty)}>{t.addFirstDish}</p>
  }

  return (
    <form
      {...stylex.props(styles.form)}
      onSubmit={(event) => {
        event.preventDefault()
        onPlan()
      }}
    >
      <label {...stylex.props(styles.label)}>
        {t.dish}
        <select
          {...stylex.props(styles.select)}
          value={selectedDishId}
          onChange={(event) => onSelectDish(event.target.value)}
        >
          {dishes.map((dish) => (
            <option value={dish._id} key={dish._id}>
              {dish.name}
            </option>
          ))}
        </select>
      </label>
      <label {...stylex.props(styles.label)}>
        {t.day}
        <select
          {...stylex.props(styles.select)}
          value={selectedDate}
          onChange={(event) => onSelectDate(event.target.value)}
        >
          {week.map((day) => (
            <option value={day.date} key={day.date}>
              {day.weekday}, {day.month} {day.dayNumber}
            </option>
          ))}
        </select>
      </label>
      <button {...stylex.props(styles.button)} disabled={busy}>
        {t.addToWeek}
      </button>
    </form>
  )
}

export function PlanDinner({
  dishes,
  week,
  selectedDishId,
  selectedDate,
  busy,
  onSelectDish,
  onSelectDate,
  onPlan,
}: {
  dishes: Dish[]
  week: Day[]
  selectedDishId: string
  selectedDate: string
  busy: boolean
  onSelectDish: (dishId: string) => void
  onSelectDate: (date: string) => void
  onPlan: () => void
}) {
  const { t } = useI18n()
  return (
    <section {...stylex.props(styles.panel)} aria-labelledby="plan-heading" id="plan-dinner">
      <div {...stylex.props(styles.heading)}>
        <span {...stylex.props(styles.icon)} aria-hidden="true">
          <PlusIcon />
        </span>
        <div>
          <p {...stylex.props(styles.eyebrow)}>{t.pickFromDishes}</p>
          <h2 {...stylex.props(styles.title)} id="plan-heading">
            {t.planDinner}
          </h2>
        </div>
      </div>
      <PlanDinnerForm
        dishes={dishes}
        week={week}
        selectedDishId={selectedDishId}
        selectedDate={selectedDate}
        busy={busy}
        onSelectDish={onSelectDish}
        onSelectDate={onSelectDate}
        onPlan={onPlan}
      />
    </section>
  )
}
