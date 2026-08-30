import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'

const styles = stylex.create({
  icon: { display: 'block', width: 20, height: 20, flex: '0 0 auto' },
  fill: { width: '100%', height: '100%' },
})

function Icon({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  return (
    <svg
      {...stylex.props(styles.icon, fill && styles.fill)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <Icon>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Icon>
  )
}

export function CheckIcon() {
  return (
    <Icon>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  )
}

export function HeartIcon() {
  return (
    <Icon>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    </Icon>
  )
}

export function HomeIcon() {
  return (
    <Icon>
      <path d="m3 11 9-8 9 8v9H7v-6h10v6" />
    </Icon>
  )
}

export function NoodleBowlIcon() {
  return (
    <Icon fill>
      <path d="M4 10h16c0 6-3 9-8 9s-8-3-8-9Z" />
      <path d="M7 6c0-2 2-2 2-4M12 6c0-2 2-2 2-4M17 6c0-2 2-2 2-4M8 22h8" />
    </Icon>
  )
}

export function PlateIcon() {
  return (
    <Icon fill>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 7v10M16 7v10M8 12h8" />
    </Icon>
  )
}

export function PlusIcon() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function SunIcon() {
  return (
    <Icon fill>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  )
}

export function UsersIcon() {
  return (
    <Icon>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  )
}
