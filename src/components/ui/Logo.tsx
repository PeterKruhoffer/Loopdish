import * as stylex from '@stylexjs/stylex'
import { PlateIcon } from './Icon'
import { colors } from './theme.stylex'

const display = 'Manrope, system-ui, sans-serif'

const styles = stylex.create({
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: display,
    fontSize: 19,
    fontWeight: 800,
    letterSpacing: '-0.045em',
  },
  mark: { display: 'inline-flex', width: 27, height: 27, color: colors.coral },
})

export function Logo() {
  return (
    <div {...stylex.props(styles.logo)} aria-label="LoopDish">
      <span {...stylex.props(styles.mark)} aria-hidden="true">
        <PlateIcon />
      </span>
      <span>LoopDish</span>
    </div>
  )
}
