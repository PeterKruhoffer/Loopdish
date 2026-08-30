import * as stylex from '@stylexjs/stylex'
import { Link, useRouterState } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { CalendarIcon, HeartIcon, HomeIcon, SunIcon } from '~/components/ui/Icon'
import { LanguageSelect } from '~/components/ui/LanguageSelect'
import { Logo } from '~/components/ui/Logo'
import { useI18n } from '~/lib/i18n'
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
  headerActions: { display: 'flex', alignItems: 'center', gap: 10 },
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
  navItemActive: { color: colors.green },
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
  const { t } = useI18n()
  return (
    <header {...stylex.props(styles.topbar)}>
      <Logo />
      <div {...stylex.props(styles.headerActions)}>
        <LanguageSelect />
        <button
          {...stylex.props(styles.account)}
          aria-label={t.signOut}
          title={t.signOut}
          onClick={onSignOut}
        >
          <span {...stylex.props(styles.avatar)} aria-hidden="true">
            {(name || email || 'M').slice(0, 1).toUpperCase()}
          </span>
          <span {...stylex.props(styles.signOutLabel)}>{t.signOut}</span>
        </button>
      </div>
    </header>
  )
}

export function Hero({ name }: { name?: string | null }) {
  const { t } = useI18n()
  return (
    <section {...stylex.props(styles.hero)} id="today">
      <span {...stylex.props(styles.sun)} aria-hidden="true">
        <SunIcon />
      </span>
      <p {...stylex.props(styles.greeting)}>
        {t.greeting} {name || t.greetingFallback},
      </p>
      <h1 {...stylex.props(styles.heroTitle)}>{t.heroTitle}</h1>
      <p {...stylex.props(styles.heroCopy)}>{t.heroCopy}</p>
    </section>
  )
}

function NavItem({ to, children }: { to: '/' | '/week' | '/dishes'; children: ReactNode }) {
  const isActive = useRouterState({
    select: (state) => state.location.pathname === to,
  })

  return (
    <Link {...stylex.props(styles.navItem, isActive && styles.navItemActive)} to={to}>
      {children}
    </Link>
  )
}

export function BottomNav() {
  const { t } = useI18n()
  return (
    <nav {...stylex.props(styles.nav)} aria-label={t.mainNavigation}>
      <NavItem to="/">
        <HomeIcon /> <span>{t.today}</span>
      </NavItem>
      <NavItem to="/week">
        <CalendarIcon /> <span>{t.week}</span>
      </NavItem>
      <NavItem to="/dishes">
        <HeartIcon /> <span>{t.dishes}</span>
      </NavItem>
    </nav>
  )
}
