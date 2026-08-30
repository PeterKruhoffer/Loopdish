import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '~/features/home/AuthGate'

export const Route = createFileRoute('/suggestions')({
  component: () => <HomePage view="suggestions" />,
})
