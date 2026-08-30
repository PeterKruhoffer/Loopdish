import * as stylex from '@stylexjs/stylex'
import { CheckIcon } from '~/components/ui/Icon'
import { SectionHeading } from '~/components/ui/SectionHeading'
import type { RecentMeal } from '~/features/home/types'
import { friendlyDate } from '~/lib/dates'
import { colors } from '../../components/ui/theme.stylex'

const tablet = '@media (min-width: 720px)'

const styles = stylex.create({
  section: { marginTop: 48, [tablet]: { marginTop: 72 } },
  list: {
    display: 'grid',
    overflow: 'hidden',
    border: `1px solid ${colors.line}`,
    borderRadius: 22,
    backgroundColor: 'rgb(255 255 255 / 58%)',
  },
  row: {
    display: 'grid',
    minHeight: 64,
    gridTemplateColumns: '30px minmax(0, 1fr) auto',
    gap: 11,
    alignItems: 'center',
    padding: '0 15px',
    borderBottom: `1px solid ${colors.line}`,
    ':last-child': { borderBottom: 0 },
  },
  mark: {
    display: 'grid',
    width: 27,
    height: 27,
    placeItems: 'center',
    borderRadius: '50%',
    color: colors.green,
    backgroundColor: colors.mint,
  },
  name: { fontSize: 12, fontWeight: 700 },
  date: { color: colors.muted, fontSize: 10 },
  empty: { margin: 0, padding: '20px 16px', color: colors.muted, fontSize: 13, lineHeight: 1.55 },
})

function EmptyHistory({ meals }: { meals: RecentMeal[] }) {
  if (meals.length > 0) return null
  return <p {...stylex.props(styles.empty)}>Completed dinners will show up here.</p>
}

export function History({ meals }: { meals: RecentMeal[] }) {
  return (
    <section {...stylex.props(styles.section)} aria-labelledby="history-heading">
      <SectionHeading id="history-heading" title="Recently eaten" />
      <div {...stylex.props(styles.list)}>
        {meals.map((meal) => (
          <div {...stylex.props(styles.row)} key={meal._id}>
            <span {...stylex.props(styles.mark)}>
              <CheckIcon />
            </span>
            <strong {...stylex.props(styles.name)}>{meal.dishName}</strong>
            <span {...stylex.props(styles.date)}>{friendlyDate(meal.eatenOn)}</span>
          </div>
        ))}
        <EmptyHistory meals={meals} />
      </div>
    </section>
  )
}
