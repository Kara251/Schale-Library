import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

const allowedAdvisories = [
  {
    id: 'GHSA-r5fr-rjxr-66jc',
    module: 'lodash',
    severity: 'high',
    path: 'backend>@strapi/plugin-users-permissions>@strapi/design-system>lodash',
    reason: 'Strapi design-system dependency; npm currently has no lodash >=4.18.0 release to resolve safely.',
  },
  {
    id: 'GHSA-f23m-r3pf-42rh',
    module: 'lodash',
    severity: 'moderate',
    path: 'backend>@strapi/plugin-users-permissions>@strapi/design-system>lodash',
    reason: 'Same unresolved Strapi design-system lodash chain as GHSA-r5fr-rjxr-66jc.',
  },
  {
    id: 'GHSA-4w7w-66w2-5vf9',
    module: 'vite',
    severity: 'moderate',
    path: 'backend>@strapi/strapi>vite',
    reason: 'Strapi admin build chain; Vite 6.4.2 is not currently resolvable and Vite 7.2.7 introduces new high advisories.',
  },
  {
    id: 'GHSA-w5hq-g745-h8pq',
    module: 'uuid',
    severity: 'moderate',
    path: 'backend>@strapi/plugin-users-permissions>grant>request-oauth>uuid',
    reason: 'users-permissions OAuth dependency chain; uuid >=14.0.0 is not currently resolvable.',
  },
  {
    id: 'GHSA-848j-6mx2-7j84',
    module: 'elliptic',
    severity: 'low',
    path: 'backend>@strapi/plugin-users-permissions>jwk-to-pem>elliptic',
    reason: 'jwk-to-pem dependency chain with no patched elliptic release reported by audit.',
  },
]

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

function fail(message) {
  console.error(`[audit:prod] ${message}`)
  process.exitCode = 1
}

function runAudit() {
  const result = spawnSync('pnpm', ['audit', '--prod', '--json'], {
    cwd: root,
    encoding: 'utf8',
  })

  const output = result.stdout || result.stderr
  if (!output) {
    fail('pnpm audit did not return JSON output.')
    return null
  }

  try {
    return JSON.parse(output)
  } catch (error) {
    fail(`Could not parse pnpm audit JSON: ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

function getFindingPaths(advisory) {
  return (advisory.findings || []).flatMap((finding) => finding.paths || [])
}

function getAllowedMatch(advisory) {
  const paths = getFindingPaths(advisory)
  return allowedAdvisories.find((allowed) => (
    advisory.github_advisory_id === allowed.id &&
    advisory.module_name === allowed.module &&
    advisory.severity === allowed.severity &&
    paths.length > 0 &&
    paths.every((path) => path === allowed.path)
  ))
}

const audit = runAudit()

if (audit) {
  const advisories = Object.values(audit.advisories || {})
  const allowed = []
  const unexpected = []

  for (const advisory of advisories) {
    const match = getAllowedMatch(advisory)
    if (match) {
      allowed.push({ advisory, match })
      continue
    }

    unexpected.push(advisory)
  }

  if (unexpected.length > 0) {
    for (const advisory of unexpected) {
      fail(`Unexpected ${advisory.severity} advisory ${advisory.github_advisory_id || advisory.id} in ${advisory.module_name}: ${advisory.title}`)
    }
  }

  const publicAdmin = process.env.STRAPI_ADMIN_PUBLIC === 'true'
  const allowedHigh = allowed.filter(({ advisory }) => severityRank[advisory.severity] >= severityRank.high)
  if (publicAdmin && allowedHigh.length > 0) {
    for (const { advisory } of allowedHigh) {
      fail(`Public Strapi Admin is blocked while high advisory ${advisory.github_advisory_id} remains in ${advisory.module_name}.`)
    }
  }

  if (!process.exitCode) {
    const summary = allowed.map(({ advisory }) => `${advisory.severity}:${advisory.module_name}:${advisory.github_advisory_id}`).join(', ')
    console.log(summary ? `[audit:prod] Passed with known upstream advisories: ${summary}` : '[audit:prod] No production advisories found.')
  }
}
