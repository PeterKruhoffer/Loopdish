import { convexQuery } from '@convex-dev/react-query'
import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@workos/authkit-tanstack-react-start/client'
import { useMutation } from 'convex/react'
import { startTransition, useActionState } from 'react'
import { LanguageSelect } from '~/components/ui/LanguageSelect'
import { Logo } from '~/components/ui/Logo'
import { userErrorMessage } from '~/lib/errors'
import { useI18n } from '~/lib/i18n'
import { api } from '../../../convex/_generated/api'
import { colors } from '../../components/ui/theme.stylex'

const tablet = '@media (min-width: 720px)'
const display = 'Manrope, system-ui, sans-serif'

const styles = stylex.create({
  shell: { display: 'grid', minHeight: '100vh', padding: 18, placeItems: 'center' },
  card: {
    width: 'min(560px, 100%)',
    padding: '30px 24px',
    border: `1px solid ${colors.line}`,
    borderRadius: 28,
    backgroundColor: colors.white,
    boxShadow: '0 18px 50px rgb(73 58 39 / 10%)',
    [tablet]: { padding: 44 },
  },
  top: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  eyebrow: {
    marginTop: 42,
    color: colors.coral,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 6,
    fontFamily: display,
    fontSize: 'clamp(34px, 8vw, 52px)',
    lineHeight: 1,
    letterSpacing: '-0.06em',
  },
  householdName: { color: colors.green },
  copy: { marginTop: 17, color: colors.muted, fontSize: 14, lineHeight: 1.65 },
  button: {
    appearance: 'none',
    display: 'inline-flex',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 26,
    padding: '0 19px',
    border: 0,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 13,
    fontWeight: 800,
    textDecoration: 'none',
    ':hover': { backgroundColor: '#3b5048' },
  },
  error: { marginTop: 18, color: '#8a3c2a', fontSize: 12, lineHeight: 1.5 },
})

export function JoinHousehold({ inviteId }: { inviteId: string }) {
  const { loading, user } = useAuth()
  const { language, t } = useI18n()
  const navigate = useNavigate()
  const inviteQuery = useQuery(convexQuery(api.households.getInvite, { inviteId }))
  const acceptInvite = useMutation(api.households.acceptInvite)
  const [error, joinAction, joining] = useActionState(async () => {
    try {
      await acceptInvite({ inviteId })
      await navigate({ to: '/household' })
      return ''
    } catch (joinError) {
      return userErrorMessage(joinError, language, t.joinHouseholdError)
    }
  }, '')
  const invite = inviteQuery.data

  let content
  if (inviteQuery.isPending || loading) {
    content = <p {...stylex.props(styles.copy)}>{t.loading}</p>
  } else if (inviteQuery.isError) {
    content = (
      <>
        <p {...stylex.props(styles.error)} role="alert">
          {t.inviteLoadError} {t.inviteLoadErrorHelp}
        </p>
        <button
          {...stylex.props(styles.button)}
          type="button"
          onClick={() => void inviteQuery.refetch()}
        >
          {t.tryAgain}
        </button>
      </>
    )
  } else if (!invite) {
    content = <p {...stylex.props(styles.error)}>{t.invalidInvite}</p>
  } else if (!invite.available) {
    content = <p {...stylex.props(styles.error)}>{t.inviteUnavailable}</p>
  } else {
    content = (
      <>
        <p {...stylex.props(styles.eyebrow)}>{t.invitedEyebrow}</p>
        <h1 {...stylex.props(styles.title)}>
          {t.invitedTitle}{' '}
          <span {...stylex.props(styles.householdName)}>{invite.householdName}</span>
        </h1>
        <p {...stylex.props(styles.copy)}>{t.invitedCopy}</p>
        {user ? (
          <button
            {...stylex.props(styles.button)}
            disabled={joining}
            onClick={() => startTransition(joinAction)}
            type="button"
          >
            {joining ? t.joiningHousehold : t.joinHousehold}
          </button>
        ) : (
          <a
            {...stylex.props(styles.button)}
            href={`/api/auth/sign-in?returnPathname=${encodeURIComponent(`/join/${inviteId}`)}`}
          >
            {t.continueWithGoogle}
          </a>
        )}
        {error && (
          <p {...stylex.props(styles.error)} aria-live="polite" role="alert">
            {error}
          </p>
        )}
      </>
    )
  }

  return (
    <main {...stylex.props(styles.shell)}>
      <section {...stylex.props(styles.card)}>
        <div {...stylex.props(styles.top)}>
          <Logo />
          <LanguageSelect />
        </div>
        {content}
      </section>
    </main>
  )
}
