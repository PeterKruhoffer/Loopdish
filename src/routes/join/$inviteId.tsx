import { createFileRoute } from '@tanstack/react-router'
import { JoinHousehold } from '~/features/household/JoinHousehold'

export const Route = createFileRoute('/join/$inviteId')({
  ssr: false,
  component: JoinPage,
})

function JoinPage() {
  const { inviteId } = Route.useParams()
  return <JoinHousehold inviteId={inviteId} />
}
