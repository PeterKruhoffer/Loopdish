#!/usr/bin/env bash
set -euo pipefail

: "${PUBLIC_URL:?Amp must provide PUBLIC_URL for the LoopDish portal}"
: "${WORKOS_API_KEY:?Add WORKOS_API_KEY as an Amp project secret}"
: "${WORKOS_CLIENT_ID:?Add WORKOS_CLIENT_ID as an Amp project environment variable}"
: "${WORKOS_COOKIE_PASSWORD:?Add WORKOS_COOKIE_PASSWORD as an Amp project secret}"

export WORKOS_REDIRECT_URI="${PUBLIC_URL%/}/api/auth/callback"
node scripts/register-workos-preview.mjs
exec pnpm start
