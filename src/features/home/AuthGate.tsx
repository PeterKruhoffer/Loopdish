import * as stylex from '@stylexjs/stylex'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { Logo } from '~/components/ui/Logo'
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
  if (loading) {
    return (
      <main {...stylex.props(styles.shell)}>
        <p {...stylex.props(styles.loading)}>Loading LoopDish…</p>
      </main>
    )
  }
  if (user) return <ConnectedHome view={view} />

  return (
    <main {...stylex.props(styles.shell)}>
      <div {...stylex.props(styles.card)}>
        <Logo />
        <p {...stylex.props(styles.eyebrow)}>Dinner, remembered</p>
        <h1 {...stylex.props(styles.title)}>Your dinner rotation starts here.</h1>
        <p {...stylex.props(styles.copy)}>
          Sign in with Google to plan the week and keep your dinner history private.
        </p>
        <a
          {...stylex.props(styles.button)}
          href={`/api/auth/sign-in?returnPathname=${view === 'today' ? '/' : `/${view}`}`}
        >
          Continue with Google
        </a>
      </div>
    </main>
  )
}
