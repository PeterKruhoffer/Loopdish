import * as stylex from '@stylexjs/stylex'
import { CheckIcon, NoodleBowlIcon, PlusIcon } from '~/components/ui/Icon'
import { SectionHeading } from '~/components/ui/SectionHeading'
import { DashboardError, DashboardSkeleton } from '~/features/home/LoadingState'
import type { PlannedMeal } from '~/features/home/types'
import type { Day } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'

const styles = stylex.create({
  section: { scrollMarginTop: 20 },
  weekSwitch: {
    display: 'inline-flex',
    gap: 3,
    marginBottom: 18,
    padding: 3,
    border: `1px solid ${colors.line}`,
    borderRadius: 999,
    backgroundColor: 'rgb(255 255 255 / 58%)',
  },
  weekSwitchButton: {
    minHeight: 35,
    padding: '0 13px',
    border: 0,
    borderRadius: 999,
    color: colors.muted,
    backgroundColor: 'transparent',
    fontSize: 11,
    fontWeight: 800,
    [motion]: { transition: 'color 150ms ease, background-color 150ms ease' },
  },
  weekSwitchButtonActive: {
    color: '#fff',
    backgroundColor: colors.green,
  },
  days: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(43px, 1fr))',
    gap: 7,
    overflowX: 'auto',
    paddingBottom: 2,
    scrollbarWidth: 'none',
    [tablet]: { gap: 12 },
  },
  day: {
    position: 'relative',
    display: 'grid',
    minWidth: 43,
    height: 66,
    gap: 1,
    placeItems: 'center',
    padding: '7px 2px',
    border: `1px solid ${colors.line}`,
    borderRadius: 24,
    color: colors.muted,
    backgroundColor: 'rgb(255 255 255 / 72%)',
    [tablet]: { height: 72 },
    [motion]: { transition: 'color 150ms ease, background-color 150ms ease, transform 150ms ease' },
    ':active': { transform: 'scale(0.97)' },
  },
  dayActive: { borderColor: colors.green, color: '#fff', backgroundColor: colors.green },
  dayLetter: { fontSize: 9, fontWeight: 800 },
  dayNumber: { color: colors.ink, fontFamily: display, fontSize: 15 },
  dayNumberActive: { color: '#fff' },
  planDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: '50%',
    backgroundColor: colors.coral,
  },
  card: {
    position: 'relative',
    minHeight: 300,
    marginTop: 22,
    padding: 20,
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: colors.coralSoft,
    boxShadow: '0 14px 28px rgb(110 73 57 / 12%)',
    [tablet]: { minHeight: 350, marginTop: 28, padding: 28 },
  },
  emptyCard: { backgroundColor: '#f4c79f' },
  topline: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#674a42',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  today: { padding: '4px 7px', borderRadius: 999, backgroundColor: 'rgb(255 249 233 / 58%)' },
  foodDoodle: {
    position: 'absolute',
    top: 48,
    right: -8,
    display: 'grid',
    width: 148,
    height: 148,
    placeItems: 'center',
    border: '2px solid rgb(255 249 233 / 72%)',
    borderRadius: '50%',
    color: colors.cream,
    transform: 'rotate(7deg)',
    [tablet]: { top: 58, right: 38, width: 205, height: 205 },
  },
  dinnerName: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '62%',
    marginTop: 130,
    fontFamily: display,
    fontSize: 28,
    lineHeight: 1.02,
    letterSpacing: '-0.05em',
    overflowWrap: 'anywhere',
    [tablet]: { maxWidth: '55%', marginTop: 156, fontSize: 40 },
  },
  actions: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    left: 20,
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    [tablet]: { right: 28, bottom: 28, left: 28 },
  },
  ateButton: {
    display: 'inline-flex',
    minHeight: 42,
    alignItems: 'center',
    gap: 7,
    padding: '0 15px',
    border: 0,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 11,
    fontWeight: 800,
  },
  removeButton: {
    padding: 8,
    border: 0,
    color: '#674a42',
    backgroundColor: 'transparent',
    fontSize: 10,
    fontWeight: 700,
  },
  eaten: {
    position: 'absolute',
    bottom: 22,
    left: 20,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 999,
    color: colors.green,
    backgroundColor: colors.mint,
    fontSize: 11,
    fontWeight: 800,
  },
  empty: { display: 'grid', minHeight: 242, placeItems: 'center', alignContent: 'center' },
  emptyPlate: {
    display: 'grid',
    width: 58,
    height: 58,
    placeItems: 'center',
    border: `2px dashed ${colors.cream}`,
    borderRadius: '50%',
    color: colors.cream,
  },
  emptyTitle: { marginTop: 12, fontFamily: display, fontSize: 21, letterSpacing: '-0.04em' },
  emptyCopy: { marginTop: 3, color: '#674a42', fontSize: 11 },
  pickButton: {
    display: 'inline-flex',
    minHeight: 39,
    alignItems: 'center',
    marginTop: 16,
    padding: '0 15px',
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 11,
    fontWeight: 800,
    textDecoration: 'none',
  },
})

function PlanDot({ planned }: { planned: boolean }) {
  if (!planned) return null
  return <i {...stylex.props(styles.planDot)} />
}

function TodayLabel({ isToday }: { isToday: boolean }) {
  const { t } = useI18n()
  if (!isToday) return null
  return <span {...stylex.props(styles.today)}>{t.today}</span>
}

function DinnerActions({
  plan,
  day,
  busy,
  onMarkEaten,
  onRemove,
}: {
  plan: PlannedMeal
  day: Day
  busy: boolean
  onMarkEaten: (plan: PlannedMeal) => void
  onRemove: (plan: PlannedMeal) => void
}) {
  const { t } = useI18n()
  if (plan.completedAt) {
    return (
      <span {...stylex.props(styles.eaten)}>
        <CheckIcon /> {t.addedToHistory}
      </span>
    )
  }

  return (
    <div {...stylex.props(styles.actions)}>
      <button {...stylex.props(styles.ateButton)} disabled={busy} onClick={() => onMarkEaten(plan)}>
        <CheckIcon /> {t.weAteThis}
      </button>
      <button
        {...stylex.props(styles.removeButton)}
        aria-label={`${t.remove} ${plan.dishName}, ${day.weekday}`}
        disabled={busy}
        onClick={() => onRemove(plan)}
      >
        {t.remove}
      </button>
    </div>
  )
}

function EmptyDinner({ day }: { day: Day }) {
  const { t } = useI18n()
  return (
    <article {...stylex.props(styles.card, styles.emptyCard)}>
      <DinnerTopline day={day} />
      <div {...stylex.props(styles.empty)}>
        <span {...stylex.props(styles.emptyPlate)} aria-hidden="true">
          <PlusIcon />
        </span>
        <h3 {...stylex.props(styles.emptyTitle)}>{t.nothingPlanned}</h3>
        <p {...stylex.props(styles.emptyCopy)}>{t.nothingPlannedCopy}</p>
        <a {...stylex.props(styles.pickButton)} href="#plan-dinner">
          {t.pickDinner}
        </a>
      </div>
    </article>
  )
}

function DinnerTopline({ day }: { day: Day }) {
  return (
    <div {...stylex.props(styles.topline)}>
      <span>
        {day.weekday}, {day.month} {day.dayNumber}
      </span>
      <TodayLabel isToday={day.isToday} />
    </div>
  )
}

function DinnerCard({
  day,
  plan,
  busy,
  onMarkEaten,
  onRemove,
}: {
  day: Day
  plan?: PlannedMeal
  busy: boolean
  onMarkEaten: (plan: PlannedMeal) => void
  onRemove: (plan: PlannedMeal) => void
}) {
  if (!plan) return <EmptyDinner day={day} />

  return (
    <article {...stylex.props(styles.card)}>
      <DinnerTopline day={day} />
      <div {...stylex.props(styles.foodDoodle)} aria-hidden="true">
        <NoodleBowlIcon />
      </div>
      <h3 {...stylex.props(styles.dinnerName)}>{plan.dishName}</h3>
      <DinnerActions
        plan={plan}
        day={day}
        busy={busy}
        onMarkEaten={onMarkEaten}
        onRemove={onRemove}
      />
    </article>
  )
}

export function WeekPlanner({
  week,
  weekOffset,
  plans,
  selectedDate,
  busy,
  isPending,
  queryError,
  onSelectWeek,
  onSelectDate,
  onMarkEaten,
  onRemove,
  onRetry,
}: {
  week: Day[]
  weekOffset: number
  plans: PlannedMeal[]
  selectedDate: string
  busy: boolean
  isPending: boolean
  queryError: string
  onSelectWeek: (weekOffset: number) => void
  onSelectDate: (date: string) => void
  onMarkEaten: (plan: PlannedMeal) => void
  onRemove: (plan: PlannedMeal) => void
  onRetry: () => void
}) {
  const { t } = useI18n()
  const selectedDay = week.find((day) => day.date === selectedDate) ?? week[0]
  const selectedPlan = plans.find((meal) => meal.date === selectedDate)

  return (
    <section {...stylex.props(styles.section)} aria-labelledby="week-heading" id="week">
      <SectionHeading
        id="week-heading"
        title={weekOffset === 0 ? t.thisWeek : t.nextWeek}
        meta={`${week[0].month} ${week[0].dayNumber}–${week[6].month} ${week[6].dayNumber}`}
      />

      <div {...stylex.props(styles.weekSwitch)} aria-label={t.chooseWeek} role="group">
        {[0, 1].map((offset) => {
          const isActive = offset === weekOffset
          return (
            <button
              {...stylex.props(styles.weekSwitchButton, isActive && styles.weekSwitchButtonActive)}
              type="button"
              key={offset}
              aria-pressed={isActive}
              onClick={() => onSelectWeek(offset)}
            >
              {offset === 0 ? t.thisWeek : t.nextWeek}
            </button>
          )
        })}
      </div>

      {isPending ? (
        <DashboardSkeleton view="week" />
      ) : queryError ? (
        <DashboardError message={queryError} onRetry={onRetry} />
      ) : (
        <>
          <div {...stylex.props(styles.days)}>
            {week.map((day) => {
              const isSelected = day.date === selectedDate
              return (
                <button
                  {...stylex.props(styles.day, isSelected && styles.dayActive)}
                  key={day.date}
                  onClick={() => onSelectDate(day.date)}
                  aria-pressed={isSelected}
                  aria-label={`${day.weekday}, ${day.month} ${day.dayNumber}`}
                >
                  <span {...stylex.props(styles.dayLetter)}>{day.weekday.slice(0, 1)}</span>
                  <strong {...stylex.props(styles.dayNumber, isSelected && styles.dayNumberActive)}>
                    {day.dayNumber}
                  </strong>
                  <PlanDot planned={plans.some((meal) => meal.date === day.date)} />
                </button>
              )
            })}
          </div>

          <DinnerCard
            day={selectedDay}
            plan={selectedPlan}
            busy={busy}
            onMarkEaten={onMarkEaten}
            onRemove={onRemove}
          />
        </>
      )}
    </section>
  )
}
