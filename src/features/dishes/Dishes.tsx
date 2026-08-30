import * as stylex from '@stylexjs/stylex'
import { useActionState, useDeferredValue, useMemo, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { PlateIcon, PlusIcon, SearchIcon } from '~/components/ui/Icon'
import { SectionHeading } from '~/components/ui/SectionHeading'
import type { Dish } from '~/features/home/types'
import { friendlyDate } from '~/lib/dates'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'

const styles = stylex.create({
  section: { marginTop: 48, scrollMarginTop: 20, [tablet]: { marginTop: 72 } },
  searchControl: { position: 'relative', marginBottom: 25 },
  searchIcon: {
    position: 'absolute',
    top: '50%',
    left: 15,
    display: 'inline-flex',
    color: colors.muted,
    pointerEvents: 'none',
    transform: 'translateY(-50%)',
  },
  search: {
    width: '100%',
    height: 50,
    padding: '0 16px 0 45px',
    border: `1px solid ${colors.line}`,
    borderRadius: 15,
    backgroundColor: 'rgb(255 254 249 / 80%)',
    boxShadow: '0 6px 18px rgb(73 58 39 / 4%)',
    fontSize: 14,
  },
  groups: { display: 'grid', minWidth: 0, gap: 28 },
  group: { minWidth: 0 },
  groupHeading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  groupTitle: {
    fontFamily: display,
    fontSize: 16,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
  },
  groupCount: { color: colors.muted, fontSize: 10 },
  shelf: {
    display: 'grid',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    gridAutoColumns: 'minmax(150px, 44%)',
    gridAutoFlow: 'column',
    gap: 9,
    overflowX: 'auto',
    overscrollBehaviorInline: 'contain',
    padding: '2px 2px 10px',
    scrollbarColor: '#c9c2af transparent',
    scrollbarWidth: 'thin',
    scrollSnapType: 'x proximity',
    ':focus-visible': {
      outline: '3px solid rgb(239 99 73 / 30%)',
      outlineOffset: 2,
    },
    [tablet]: {
      gridAutoColumns: 'minmax(190px, 24%)',
    },
  },
  card: {
    position: 'relative',
    minHeight: 145,
    padding: 16,
    overflow: 'hidden',
    borderRadius: 19,
    backgroundColor: '#f5d8a8',
    scrollSnapAlign: 'start',
    [tablet]: { minHeight: 160, padding: 17, borderRadius: 22 },
  },
  cardAlt: { backgroundColor: '#cfe5d6' },
  plate: {
    position: 'absolute',
    top: 14,
    right: 14,
    display: 'inline-flex',
    width: 34,
    height: 34,
    color: 'rgb(38 53 47 / 24%)',
  },
  title: {
    display: '-webkit-box',
    maxWidth: '75%',
    margin: 0,
    overflow: 'hidden',
    fontFamily: display,
    fontSize: 15,
    lineHeight: 1.1,
    letterSpacing: '-0.035em',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    [tablet]: { fontSize: 17 },
  },
  notes: {
    display: '-webkit-box',
    maxWidth: '85%',
    marginTop: 8,
    overflow: 'hidden',
    color: '#657068',
    fontSize: 10,
    lineHeight: 1.4,
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
  },
  stat: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    color: '#657068',
    fontSize: 9,
    fontWeight: 700,
  },
  empty: { maxWidth: 440, marginTop: 16, color: colors.muted, fontSize: 13, lineHeight: 1.55 },
  noMatches: {
    padding: '36px 18px',
    border: `1px dashed ${colors.line}`,
    borderRadius: 18,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  disclosure: {
    marginTop: 15,
    border: `1px solid ${colors.line}`,
    borderRadius: 20,
    backgroundColor: 'rgb(255 255 255 / 60%)',
  },
  summary: {
    display: 'flex',
    minHeight: 54,
    alignItems: 'center',
    gap: 8,
    padding: '0 17px',
    color: colors.green,
    fontSize: 12,
    fontWeight: 800,
    listStyle: 'none',
    cursor: 'pointer',
  },
  form: {
    display: 'grid',
    gap: 13,
    padding: '4px 17px 18px',
    [tablet]: { gridTemplateColumns: '1fr 1fr auto', alignItems: 'end' },
  },
  label: { display: 'grid', gap: 7, fontSize: 11, fontWeight: 800 },
  field: {
    width: '100%',
    height: 47,
    padding: '0 13px',
    border: `1px solid ${colors.line}`,
    borderRadius: 13,
    backgroundColor: colors.white,
    fontSize: 13,
  },
  optional: { color: colors.muted, fontWeight: 400 },
  button: {
    minHeight: 47,
    padding: '0 18px',
    border: 0,
    borderRadius: 13,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 12,
    fontWeight: 800,
    [motion]: { transition: 'transform 140ms ease, background-color 140ms ease' },
    ':hover': { backgroundColor: '#3b5048' },
    ':active': { transform: 'translateY(1px)' },
  },
  formStatus: {
    gridColumn: '1 / -1',
    margin: 0,
    padding: '10px 12px',
    borderRadius: 11,
    color: '#633a2e',
    backgroundColor: '#f8d9ce',
    fontSize: 12,
  },
})

function DishCard({ dish, index }: { dish: Dish; index: number }) {
  return (
    <article {...stylex.props(styles.card, index % 2 === 1 && styles.cardAlt)}>
      <span {...stylex.props(styles.plate)} aria-hidden="true">
        <PlateIcon />
      </span>
      <h4 {...stylex.props(styles.title)}>{dish.name}</h4>
      <DishNotes notes={dish.notes} />
      <DishStat lastEatenOn={dish.lastEatenOn} />
    </article>
  )
}

function DishShelf({ id, title, dishes }: { id: string; title: string; dishes: Dish[] }) {
  if (dishes.length === 0) return null

  return (
    <section {...stylex.props(styles.group)} aria-labelledby={id}>
      <div {...stylex.props(styles.groupHeading)}>
        <h3 {...stylex.props(styles.groupTitle)} id={id}>
          {title}
        </h3>
        <span {...stylex.props(styles.groupCount)}>{dishes.length}</span>
      </div>
      <div {...stylex.props(styles.shelf)} tabIndex={0}>
        {dishes.map((dish, index) => (
          <DishCard dish={dish} index={index} key={dish._id} />
        ))}
      </div>
    </section>
  )
}

function DishNotes({ notes }: { notes?: string }) {
  if (!notes) return null
  return <p {...stylex.props(styles.notes)}>{notes}</p>
}

function DishStat({ lastEatenOn }: { lastEatenOn?: string }) {
  const { language, t } = useI18n()
  if (!lastEatenOn) return <p {...stylex.props(styles.stat)}>{t.notTriedYet}</p>
  return (
    <p {...stylex.props(styles.stat)}>
      {t.lastHad} {friendlyDate(lastEatenOn, language)}
    </p>
  )
}

function EmptyDishes({ dishes }: { dishes: Dish[] }) {
  const { t } = useI18n()
  if (dishes.length > 0) return null
  return <p {...stylex.props(styles.empty)}>{t.emptyDishes}</p>
}

function FormStatus({ message }: { message: string }) {
  if (!message) return null
  return (
    <p {...stylex.props(styles.formStatus)} role="status" aria-live="polite">
      {message}
    </p>
  )
}

function SaveDishButton() {
  const { pending } = useFormStatus()
  const { t } = useI18n()
  return (
    <button {...stylex.props(styles.button)} disabled={pending} type="submit">
      {t.saveDish}
    </button>
  )
}

function messageFrom(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function Dishes({
  dishes,
  addDishAction,
}: {
  dishes: Dish[]
  addDishAction: (name: string, notes?: string) => Promise<void>
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const query = deferredSearch.trim().toLocaleLowerCase()
  const [statusMessage, submitAction] = useActionState(
    async (_previousMessage: string, formData: FormData) => {
      const submittedName = formData.get('name')
      const submittedNotes = formData.get('notes')
      if (typeof submittedName !== 'string' || typeof submittedNotes !== 'string') {
        return t.somethingWentWrong
      }

      try {
        await addDishAction(submittedName, submittedNotes || undefined)
        setName('')
        setNotes('')
        return t.dishAdded
      } catch (error) {
        return messageFrom(error, t.somethingWentWrong)
      }
    },
    '',
  )
  const filteredDishes = useMemo(() => {
    if (!query) return dishes
    return dishes.filter((dish) =>
      `${dish.name} ${dish.notes ?? ''}`.toLocaleLowerCase().includes(query),
    )
  }, [dishes, query])
  const untriedDishes = filteredDishes.filter((dish) => !dish.lastEatenOn)
  const recentlyEatenDishes = filteredDishes
    .filter((dish) => dish.lastEatenOn)
    .sort((a, b) => b.lastEatenOn!.localeCompare(a.lastEatenOn!))
  const savedMeta = query
    ? `${filteredDishes.length} ${t.of} ${dishes.length} ${t.saved}`
    : `${dishes.length} ${t.saved}`

  return (
    <section {...stylex.props(styles.section)} aria-labelledby="dishes-heading" id="dishes">
      <SectionHeading id="dishes-heading" title={t.yourDishes} meta={savedMeta} />

      {dishes.length > 0 && (
        <div {...stylex.props(styles.searchControl)}>
          <span {...stylex.props(styles.searchIcon)}>
            <SearchIcon />
          </span>
          <input
            {...stylex.props(styles.search)}
            aria-label={t.searchDishes}
            type="search"
            placeholder={t.searchDishes}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      )}

      {filteredDishes.length > 0 && (
        <div {...stylex.props(styles.groups)}>
          <DishShelf id="untried-dishes" title={t.notTriedYet} dishes={untriedDishes} />
          <DishShelf
            id="recently-eaten-dishes"
            title={t.recentlyEaten}
            dishes={recentlyEatenDishes}
          />
          <DishShelf id="all-dishes" title={t.allDishes} dishes={filteredDishes} />
        </div>
      )}

      {dishes.length > 0 && filteredDishes.length === 0 && (
        <p {...stylex.props(styles.noMatches)} role="status">
          {t.noMatchingDishes}
        </p>
      )}

      <EmptyDishes dishes={dishes} />

      <details {...stylex.props(styles.disclosure)}>
        <summary {...stylex.props(styles.summary)}>
          <PlusIcon /> {t.addNewDish}
        </summary>
        <form {...stylex.props(styles.form)} action={submitAction}>
          <label {...stylex.props(styles.label)}>
            {t.dishNameLabel}
            <input
              {...stylex.props(styles.field)}
              name="name"
              required
              maxLength={80}
              placeholder={t.dishNamePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label {...stylex.props(styles.label)}>
            {t.note} <span {...stylex.props(styles.optional)}>{t.optional}</span>
            <input
              {...stylex.props(styles.field)}
              name="notes"
              maxLength={160}
              placeholder={t.notePlaceholder}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <SaveDishButton />
          <FormStatus message={statusMessage} />
        </form>
      </details>
    </section>
  )
}
