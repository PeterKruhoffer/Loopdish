import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { CalendarIcon, HeartIcon, HomeIcon, SunIcon } from '~/components/ui/Icon'
import { Logo } from '~/components/ui/Logo'
import { colors } from '../../components/ui/theme.stylex'

const display = 'Manrope, system-ui, sans-serif'
const tablet = '@media (min-width: 720px)'
const mobile = '@media (max-width: 719px)'

const styles = stylex.create({
  topbar: {
    position: 'relative',
    zIndex: 3,
    display: 'flex',
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'space-between',
    [tablet]: { minHeight: 92 },
  },
  account: {
    appearance: 'none',
    display: 'inline-flex',
    minHeight: 42,
    alignItems: 'center',
    gap: 9,
    padding: '5px 13px 5px 6px',
    border: `1px solid ${colors.line}`,
    borderRadius: 999,
    color: colors.ink,
    backgroundColor: 'rgb(255 254 249 / 78%)',
    boxShadow: '0 4px 14px rgb(73 58 39 / 6%)',
    fontSize: 12,
    fontWeight: 700,
    transition: 'border-color 160ms ease, background-color 160ms ease, transform 160ms ease',
    [mobile]: { width: 42, padding: 5 },
    ':hover': {
      borderColor: colors.coralSoft,
      backgroundColor: colors.white,
      transform: 'translateY(-1px)',
    },
  },
  avatar: {
    display: 'grid',
    width: 30,
    height: 30,
    flexShrink: 0,
    placeItems: 'center',
    borderRadius: '50%',
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 11,
    fontWeight: 800,
  },
  signOutLabel: { [mobile]: { display: 'none' } },
  hero: {
    position: 'relative',
    padding: '38px 0 36px',
    [tablet]: { padding: '66px 0 54px' },
  },
  greeting: { color: colors.muted, fontSize: 14, [tablet]: { fontSize: 16 } },
  heroTitle: {
    maxWidth: 760,
    marginTop: 4,
    fontFamily: display,
    fontSize: 'clamp(40px, 7vw, 72px)',
    lineHeight: 0.98,
    letterSpacing: '-0.065em',
  },
  heroCopy: { marginTop: 12, color: colors.muted, fontSize: 13, [tablet]: { fontSize: 15 } },
  sun: {
    position: 'absolute',
    top: 36,
    right: 5,
    width: 45,
    height: 45,
    color: '#df5338',
    transform: 'rotate(10deg)',
    [tablet]: { top: 68, right: 28, width: 64, height: 64 },
  },
  nav: {
    position: 'fixed',
    zIndex: 10,
    right: 0,
    bottom: 0,
    left: 0,
    display: 'grid',
    height: 78,
    gridTemplateColumns: 'repeat(3, 1fr)',
    padding: '10px 28px max(12px, env(safe-area-inset-bottom))',
    borderTop: `1px solid ${colors.line}`,
    backgroundColor: 'rgb(255 254 249 / 94%)',
    backdropFilter: 'blur(12px)',
    [tablet]: { display: 'none' },
  },
  navItem: {
    display: 'grid',
    gap: 3,
    justifyItems: 'center',
    color: colors.muted,
    fontSize: 9,
    fontWeight: 800,
    textDecoration: 'none',
  },
})

export function AppHeader({
  name,
  email,
  onSignOut,
}: {
  name?: string | null
  email?: string | null
  onSignOut: () => void
}) {
  return (
    <header {...stylex.props(styles.topbar)}>
      <Logo />
      <button
        {...stylex.props(styles.account)}
        aria-label="Sign out"
        title="Sign out"
        onClick={onSignOut}
      >
        <span {...stylex.props(styles.avatar)} aria-hidden="true">
          {(name || email || 'M').slice(0, 1).toUpperCase()}
        </span>
        <span {...stylex.props(styles.signOutLabel)}>Sign out</span>
      </button>
    </header>
  )
}

export function Hero({ name }: { name?: string | null }) {
  return (
    <section {...stylex.props(styles.hero)} id="today">
      <span {...stylex.props(styles.sun)} aria-hidden="true">
        <SunIcon />
      </span>
      <p {...stylex.props(styles.greeting)}>Hey {name || 'there'},</p>
      <h1 {...stylex.props(styles.heroTitle)}>What's for dinner?</h1>
      <p {...stylex.props(styles.heroCopy)}>A loose plan is still a plan.</p>
    </section>
  )
}

function NavItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a {...stylex.props(styles.navItem)} href={href}>
      {children}
    </a>
  )
}

export function BottomNav() {
  return (
    <nav {...stylex.props(styles.nav)} aria-label="Main navigation">
      <NavItem href="#today">
        <HomeIcon /> <span>Today</span>
      </NavItem>
      <NavItem href="#week">
        <CalendarIcon /> <span>Week</span>
      </NavItem>
      <NavItem href="#dishes">
        <HeartIcon /> <span>Dishes</span>
      </NavItem>
    </nav>
  )
}
