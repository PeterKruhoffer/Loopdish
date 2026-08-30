import * as stylex from '@stylexjs/stylex'
import { useState, type FormEvent } from 'react'
import { PlateIcon, PlusIcon } from '~/components/ui/Icon'
import { SectionHeading } from '~/components/ui/SectionHeading'
import type { Dish } from '~/features/home/types'
import { friendlyDate } from '~/lib/dates'
import { colors } from '../../components/ui/theme.stylex'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'
const motion = '@media (prefers-reduced-motion: no-preference)'

const styles = stylex.create({
  section: { marginTop: 48, scrollMarginTop: 20, [tablet]: { marginTop: 72 } },
  cards: {
    display: 'grid',
    gridAutoColumns: 'minmax(210px, 75%)',
    gridAutoFlow: 'column',
    gap: 12,
    overflowX: 'auto',
    padding: '2px 2px 12px',
    scrollSnapType: 'x mandatory',
    [tablet]: {
      gridAutoColumns: 'auto',
      gridAutoFlow: 'row',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      overflowX: 'visible',
    },
  },
  card: {
    position: 'relative',
    minHeight: 190,
    padding: 18,
    overflow: 'hidden',
    borderRadius: 23,
    backgroundColor: '#f5d8a8',
    scrollSnapAlign: 'start',
  },
  cardAlt: { backgroundColor: '#cfe5d6' },
  plate: {
    position: 'absolute',
    top: 15,
    right: 15,
    display: 'inline-flex',
    width: 42,
    height: 42,
    color: 'rgb(38 53 47 / 24%)',
  },
  title: {
    maxWidth: '75%',
    fontFamily: display,
    fontSize: 18,
    lineHeight: 1.1,
    letterSpacing: '-0.035em',
  },
  notes: { maxWidth: '82%', marginTop: 8, color: '#657068', fontSize: 11, lineHeight: 1.45 },
  stat: {
    position: 'absolute',
    bottom: 17,
    left: 18,
    color: '#657068',
    fontSize: 10,
    fontWeight: 700,
  },
  empty: { maxWidth: 440, marginTop: 16, color: colors.muted, fontSize: 13, lineHeight: 1.55 },
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
})

function DishCard({ dish, index }: { dish: Dish; index: number }) {
  return (
    <article {...stylex.props(styles.card, index % 2 === 1 && styles.cardAlt)}>
      <span {...stylex.props(styles.plate)} aria-hidden="true">
        <PlateIcon />
      </span>
      <h3 {...stylex.props(styles.title)}>{dish.name}</h3>
      <DishNotes notes={dish.notes} />
      <DishStat lastEatenOn={dish.lastEatenOn} />
    </article>
  )
}

function DishNotes({ notes }: { notes?: string }) {
  if (!notes) return null
  return <p {...stylex.props(styles.notes)}>{notes}</p>
}

function DishStat({ lastEatenOn }: { lastEatenOn?: string }) {
  if (!lastEatenOn) return <p {...stylex.props(styles.stat)}>Not tried yet</p>
  return <p {...stylex.props(styles.stat)}>Last had {friendlyDate(lastEatenOn)}</p>
}

function EmptyDishes({ dishes }: { dishes: Dish[] }) {
  if (dishes.length > 0) return null
  return (
    <p {...stylex.props(styles.empty)}>
      Spaghetti, tacos, takeout. Start with the dinners already in your rotation.
    </p>
  )
}

export function Dishes({
  dishes,
  busy,
  onAdd,
}: {
  dishes: Dish[]
  busy: boolean
  onAdd: (name: string, notes?: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await onAdd(name, notes || undefined)) {
      setName('')
      setNotes('')
    }
  }

  return (
    <section {...stylex.props(styles.section)} aria-labelledby="dishes-heading" id="dishes">
      <SectionHeading id="dishes-heading" title="Your dishes" meta={`${dishes.length} saved`} />

      <div {...stylex.props(styles.cards)}>
        {dishes.map((dish, index) => (
          <DishCard dish={dish} index={index} key={dish._id} />
        ))}
      </div>

      <EmptyDishes dishes={dishes} />

      <details {...stylex.props(styles.disclosure)}>
        <summary {...stylex.props(styles.summary)}>
          <PlusIcon /> Add a new dish
        </summary>
        <form {...stylex.props(styles.form)} onSubmit={(event) => void handleAdd(event)}>
          <label {...stylex.props(styles.label)}>
            What do you call it?
            <input
              {...stylex.props(styles.field)}
              required
              maxLength={80}
              placeholder="Rotisserie chicken"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label {...stylex.props(styles.label)}>
            Note <span {...stylex.props(styles.optional)}>optional</span>
            <input
              {...stylex.props(styles.field)}
              maxLength={160}
              placeholder="Usually with salad and bread"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <button {...stylex.props(styles.button)} disabled={busy}>
            Save dish
          </button>
        </form>
      </details>
    </section>
  )
}
