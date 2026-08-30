import * as stylex from '@stylexjs/stylex'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { LanguageSelect } from '~/components/ui/LanguageSelect'
import { Logo } from '~/components/ui/Logo'
import { useI18n } from '~/lib/i18n'
import { colors } from '../../components/ui/theme.stylex'
import { ConnectedHome, type AppView } from './ConnectedHome'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'

const styles = stylex.create({
  shell: { display: 'grid', minHeight: '100vh', padding: 18, placeItems: 'center' },
  card: {
    position: 'relative',
    width: 'min(520px, 100%)',
    padding: '30px 24px',
    overflow: 'hidden',
    border: `1px solid ${colors.line}`,
    borderRadius: 28,
    backgroundColor: colors.white,
    boxShadow: '0 18px 50px rgb(73 58 39 / 10%)',
    [tablet]: { padding: 44 },
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  eyebrow: {
    marginTop: 42,
    marginBottom: 5,
    color: colors.coral,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  loading: {
    marginBottom: 5,
    color: colors.coral,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: display,
    fontSize: 'clamp(32px, 8vw, 50px)',
    lineHeight: 1,
    letterSpacing: '-0.06em',
  },
  copy: { marginTop: 18, color: colors.muted, fontSize: 14, lineHeight: 1.65 },
  button: {
    display: 'inline-flex',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    padding: '0 19px',
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 13,
    fontWeight: 800,
    textDecoration: 'none',
    ':hover': { backgroundColor: '#3b5048' },
  },
})

export function HomePage({ view }: { view: AppView }) {
  const { loading, user } = useAuth()
  const { t } = useI18n()
  if (loading) {
    return (
      <main {...stylex.props(styles.shell)}>
        <p {...stylex.props(styles.loading)}>{t.loading}</p>
      </main>
    )
  }
  if (user) return <ConnectedHome view={view} />

  return (
    <main {...stylex.props(styles.shell)}>
      <div {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.cardTop)}>
          <Logo />
          <LanguageSelect />
        </div>
        <p {...stylex.props(styles.eyebrow)}>{t.authEyebrow}</p>
        <h1 {...stylex.props(styles.title)}>{t.authTitle}</h1>
        <p {...stylex.props(styles.copy)}>{t.authCopy}</p>
        <a
          {...stylex.props(styles.button)}
          href={`/api/auth/sign-in?returnPathname=${view === 'today' ? '/' : `/${view}`}`}
        >
          {t.continueWithGoogle}
        </a>
      </div>
    </main>
  )
}
