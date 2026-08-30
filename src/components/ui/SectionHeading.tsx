import * as stylex from '@stylexjs/stylex'
import { colors } from './theme.stylex'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'

const styles = stylex.create({
  heading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  title: {
    fontFamily: display,
    fontSize: 21,
    lineHeight: 1.1,
    letterSpacing: '-0.04em',
    [tablet]: { fontSize: 25 },
  },
  meta: { color: colors.muted, fontSize: 11, [tablet]: { fontSize: 13 } },
})

export function SectionHeading({ id, title, meta }: { id: string; title: string; meta?: string }) {
  return (
    <div {...stylex.props(styles.heading)}>
      <h2 {...stylex.props(styles.title)} id={id}>
        {title}
      </h2>
      <SectionMeta meta={meta} />
    </div>
  )
}

function SectionMeta({ meta }: { meta?: string }) {
  if (!meta) return null
  return <span {...stylex.props(styles.meta)}>{meta}</span>
}
