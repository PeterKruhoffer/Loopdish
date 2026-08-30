import * as stylex from '@stylexjs/stylex'
import { useI18n, type Language } from '~/lib/i18n'
import { colors } from './theme.stylex'

const styles = stylex.create({
  label: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    color: colors.muted,
    fontSize: 10,
    fontWeight: 700,
  },
  select: {
    height: 34,
    padding: '0 9px',
    border: `1px solid ${colors.line}`,
    borderRadius: 999,
    color: colors.ink,
    backgroundColor: 'rgb(255 255 255 / 75%)',
    fontSize: 11,
    fontWeight: 800,
  },
})

export function LanguageSelect() {
  const { language, setLanguage, t } = useI18n()

  return (
    <label {...stylex.props(styles.label)}>
      <span>{t.language}</span>
      <select
        {...stylex.props(styles.select)}
        aria-label={t.language}
        value={language}
        onChange={(event) => setLanguage(event.target.value as Language)}
      >
        <option value="en">{t.english}</option>
        <option value="da">{t.danish}</option>
      </select>
    </label>
  )
}
