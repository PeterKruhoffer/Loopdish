import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '~/features/home/AuthGate'

export const Route = createFileRoute('/dishes')({
  ssr: false,
  component: () => <HomePage view="dishes" />,
})
