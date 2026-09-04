import { convexQuery } from '@convex-dev/react-query'
import * as stylex from '@stylexjs/stylex'
import { useQuery } from '@tanstack/react-query'
import { useMutation } from 'convex/react'
import { startTransition, useActionState, useState, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { PlusIcon, UsersIcon } from '~/components/ui/Icon'
import { DashboardError } from '~/features/home/LoadingState'
import { userErrorMessage } from '~/lib/errors'
import { useI18n } from '~/lib/i18n'
import { api } from '../../../convex/_generated/api'
import { colors } from '../../components/ui/theme.stylex'

const tablet = '@media (min-width: 720px)'
const display = 'Manrope, system-ui, sans-serif'

const styles = stylex.create({
  hero: { padding: '36px 0 28px', [tablet]: { padding: '62px 0 42px' } },
  eyebrow: {
    color: colors.coral,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  title: {
    maxWidth: 650,
    marginTop: 7,
    fontFamily: display,
    fontSize: 'clamp(38px, 7vw, 62px)',
    lineHeight: 1,
    letterSpacing: '-0.06em',
  },
  intro: { maxWidth: 560, marginTop: 13, color: colors.muted, fontSize: 14, lineHeight: 1.6 },
  layout: { display: 'grid', gap: 18, [tablet]: { gridTemplateColumns: '1.15fr 0.85fr' } },
  singleColumn: { [tablet]: { gridTemplateColumns: 'minmax(0, 620px)' } },
  card: {
    padding: 20,
    border: `1px solid ${colors.line}`,
    borderRadius: 24,
    backgroundColor: 'rgb(255 254 249 / 78%)',
    boxShadow: '0 12px 30px rgb(73 58 39 / 7%)',
    [tablet]: { padding: 26 },
  },
  sectionTitle: { fontFamily: display, fontSize: 20, letterSpacing: '-0.035em' },
  fieldLabel: { display: 'block', marginTop: 20, fontSize: 11, fontWeight: 800 },
  householdValue: { marginTop: 7, fontFamily: display, fontSize: 19, fontWeight: 700 },
  formRow: { display: 'flex', gap: 8, marginTop: 8 },
  input: {
    minWidth: 0,
    minHeight: 44,
    flex: 1,
    padding: '0 13px',
    border: `1px solid ${colors.line}`,
    borderRadius: 12,
    backgroundColor: colors.white,
    fontSize: 13,
  },
  button: {
    appearance: 'none',
    display: 'inline-flex',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '0 16px',
    border: 0,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 12,
    fontWeight: 800,
    ':hover': { backgroundColor: '#3b5048' },
  },
  secondaryButton: {
    marginTop: 20,
    color: colors.green,
    backgroundColor: colors.mint,
    ':hover': { backgroundColor: '#d2e4d7' },
  },
  dangerButton: {
    minHeight: 38,
    marginTop: 24,
    padding: '0 13px',
    color: colors.coral,
    backgroundColor: 'transparent',
    border: `1px solid ${colors.coralSoft}`,
    ':hover': { backgroundColor: '#f8e1d9' },
  },
  memberList: { display: 'grid', gap: 4, marginTop: 14 },
  member: {
    display: 'grid',
    gridTemplateColumns: '38px minmax(0, 1fr) auto',
    gap: 11,
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${colors.line}`,
  },
  avatar: {
    display: 'grid',
    width: 38,
    height: 38,
    placeItems: 'center',
    borderRadius: '50%',
    color: '#fff',
    backgroundColor: colors.green,
    fontSize: 12,
    fontWeight: 800,
  },
  memberName: { display: 'block', overflow: 'hidden', fontSize: 13, fontWeight: 800 },
  memberEmail: { display: 'block', overflow: 'hidden', color: colors.muted, fontSize: 10 },
  badge: {
    padding: '5px 8px',
    borderRadius: 999,
    color: colors.muted,
    backgroundColor: colors.mint,
    fontSize: 9,
    fontWeight: 800,
  },
  inviteCard: { marginTop: 18, backgroundColor: '#f5d8a8' },
  inviteIcon: {
    display: 'grid',
    width: 42,
    height: 42,
    marginBottom: 16,
    placeItems: 'center',
    borderRadius: '50%',
    color: '#fff',
    backgroundColor: colors.coral,
  },
  copy: { marginTop: 8, color: colors.muted, fontSize: 12, lineHeight: 1.5 },
  inviteRow: { display: 'flex', gap: 8, marginTop: 14 },
  inviteInput: { fontSize: 10 },
  status: { marginTop: 12, color: '#633a2e', fontSize: 11, fontWeight: 700 },
})

function SaveNameButton() {
  const { pending } = useFormStatus()
  const { t } = useI18n()
  return (
    <button {...stylex.props(styles.button)} disabled={pending} type="submit">
      {t.saveName}
    </button>
  )
}

const initialInviteState = { url: '', message: '' }

export function Household({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const { language, t } = useI18n()
  const householdQuery = useQuery(convexQuery(api.households.get, {}))
  const renameHousehold = useMutation(api.households.rename)
  const createInvite = useMutation(api.households.createInvite)
  const [nameMessage, saveNameAction] = useActionState(
    async (_previousMessage: string, formData: FormData) => {
      const name = formData.get('name')
      if (typeof name !== 'string') return t.somethingWentWrong

      try {
        await renameHousehold({ name })
        return t.householdSaved
      } catch (error) {
        return userErrorMessage(error, language, t.renameHouseholdError)
      }
    },
    '',
  )
  const [inviteState, createInviteAction, isCreatingInvite] = useActionState(async () => {
    try {
      const inviteId = await createInvite({})
      const url = `${window.location.origin}/join/${inviteId}`
      try {
        await navigator.clipboard.writeText(url)
        return { url, message: t.linkCopied }
      } catch {
        return { url, message: t.inviteReady }
      }
    } catch (error) {
      return { url: '', message: userErrorMessage(error, language, t.createInviteError) }
    }
  }, initialInviteState)
  const [copyMessage, copyInviteAction, isCopyingInvite] = useActionState(
    async (_previousMessage: string, inviteUrl: string) => {
      try {
        await navigator.clipboard.writeText(inviteUrl)
        return t.linkCopied
      } catch {
        return t.inviteReady
      }
    },
    '',
  )
  const [isSigningOut, startSignOutAction] = useTransition()
  const [signOutMessage, setSignOutMessage] = useState('')
  const data = householdQuery.data
  const canManageHousehold = data?.canManageHousehold === true

  return (
    <>
      <section {...stylex.props(styles.hero)}>
        <p {...stylex.props(styles.eyebrow)}>{t.householdEyebrow}</p>
        <h1 {...stylex.props(styles.title)}>{t.householdTitle}</h1>
        <p {...stylex.props(styles.intro)}>{t.householdCopy}</p>
      </section>
      {householdQuery.isError && !data ? (
        <DashboardError
          title={t.householdLoadError}
          message={t.householdLoadErrorHelp}
          onRetry={() => householdQuery.refetch()}
        />
      ) : (
        <div {...stylex.props(styles.layout, !canManageHousehold && styles.singleColumn)}>
          <section {...stylex.props(styles.card)}>
            <h2 {...stylex.props(styles.sectionTitle)}>{t.people}</h2>
            {canManageHousehold ? (
              <form action={saveNameAction}>
                <label {...stylex.props(styles.fieldLabel)} htmlFor="household-name">
                  {t.householdName}
                </label>
                <div {...stylex.props(styles.formRow)}>
                  <input
                    {...stylex.props(styles.input)}
                    key={data?.household?.name}
                    id="household-name"
                    name="name"
                    defaultValue={data?.household?.name}
                    placeholder={t.householdNamePlaceholder}
                    required
                  />
                  <SaveNameButton />
                </div>
                {nameMessage && (
                  <p {...stylex.props(styles.status)} aria-live="polite" role="status">
                    {nameMessage}
                  </p>
                )}
              </form>
            ) : data ? (
              <div>
                <p {...stylex.props(styles.fieldLabel)}>{t.householdName}</p>
                <p {...stylex.props(styles.householdValue)}>{data?.household?.name}</p>
              </div>
            ) : null}
            <div {...stylex.props(styles.memberList)}>
              {data?.members.map((member) => (
                <div
                  {...stylex.props(styles.member)}
                  key={member.id ?? member.email ?? member.name}
                >
                  <span {...stylex.props(styles.avatar)}>
                    {member.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong {...stylex.props(styles.memberName)}>
                      {member.name} {member.isCurrentUser ? `(${t.you})` : ''}
                    </strong>
                    {member.email && (
                      <span {...stylex.props(styles.memberEmail)}>{member.email}</span>
                    )}
                  </span>
                  <span {...stylex.props(styles.badge)}>
                    {member.role === 'owner' ? t.owner : t.member}
                  </span>
                </div>
              ))}
            </div>
            <button
              {...stylex.props(styles.button, styles.dangerButton)}
              disabled={isSigningOut}
              onClick={() => {
                setSignOutMessage('')
                startSignOutAction(async () => {
                  try {
                    await signOutAction()
                  } catch (error) {
                    setSignOutMessage(userErrorMessage(error, language, t.signOutError))
                  }
                })
              }}
              type="button"
            >
              {t.signOut}
            </button>
            {signOutMessage && (
              <p {...stylex.props(styles.status)} aria-live="assertive" role="alert">
                {signOutMessage}
              </p>
            )}
          </section>

          {canManageHousehold && (
            <section {...stylex.props(styles.card, styles.inviteCard)}>
              <span {...stylex.props(styles.inviteIcon)}>
                <UsersIcon />
              </span>
              <h2 {...stylex.props(styles.sectionTitle)}>{t.inviteSomeone}</h2>
              <p {...stylex.props(styles.copy)}>{t.inviteCopy}</p>
              {!inviteState.url ? (
                <button
                  {...stylex.props(styles.button, styles.secondaryButton)}
                  disabled={isCreatingInvite}
                  onClick={() => startTransition(createInviteAction)}
                  type="button"
                >
                  <PlusIcon /> {t.createInvite}
                </button>
              ) : (
                <div {...stylex.props(styles.inviteRow)}>
                  <input
                    {...stylex.props(styles.input, styles.inviteInput)}
                    aria-label={t.createInvite}
                    readOnly
                    value={inviteState.url}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <button
                    {...stylex.props(styles.button)}
                    disabled={isCopyingInvite}
                    onClick={() => startTransition(() => copyInviteAction(inviteState.url))}
                    type="button"
                  >
                    {t.copyLink}
                  </button>
                </div>
              )}
              {(copyMessage || inviteState.message) && (
                <p {...stylex.props(styles.status)} aria-live="polite" role="status">
                  {copyMessage || inviteState.message}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </>
  )
}
