// Both production aliases belong to this dashboard. Do not accept arbitrary
// Vercel hosts, forwarded-host headers or similarly named domains as origins.
const DASHBOARD_ORIGINS = new Set([
  'https://dashboard-fisiologia-angelo-melim.vercel.app',
  'https://dashboard-fisiologia-novorizontino.vercel.app',
])
export function isAllowedWriteOrigin(origin, expected) {
  if (!origin || origin === expected) return true
  return DASHBOARD_ORIGINS.has(expected) && DASHBOARD_ORIGINS.has(origin)
}
